// CSV parsing and procurement metrics calculation utilities
// Fixed version - tuned for DOC/USAspending CSV schema

export function parseCSV(text: string): Record<string, any>[] {
  const rows: string[][] = [];
  let cur: string[] = [];
  let field = '';
  let inQuotes = false;
  
  for (let i = 0; i < text.length; i++) {
    const char = text[i];
    const next = text[i + 1];
    
    if (char === '"') {
      inQuotes = !inQuotes;
    } else if (char === ',' && !inQuotes) {
      cur.push(field);
      field = '';
    } else if ((char === '\r' || char === '\n') && !inQuotes) {
      if (field || cur.length) {
        cur.push(field);
        rows.push(cur);
        cur = [];
        field = '';
      }
      if (char === '\r' && next === '\n') i++; // Skip CRLF
    } else {
      field += char;
    }
  }
  
  if (field || cur.length) {
    cur.push(field);
    rows.push(cur);
  }
  
  if (rows.length === 0) return [];
  
  const headers = rows[0].map(h => h.trim().replace(/^"|"$/g, ''));
  
  return rows.slice(1).filter(r => r.length && r.some(x => x !== '')).map(cols => {
    const obj: Record<string, any> = {};
    headers.forEach((h, i) => obj[h] = (cols[i] ?? '').replace(/^"|"$/g, ''));
    return obj;
  });
}

function num(row: Record<string, any>, names: string[]): number {
  for (const n of names) {
    if (row[n] != null && row[n] !== '') {
      const v = Number(String(row[n]).replace(/[^\d.-]/g, ''));
      if (!Number.isNaN(v)) return v;
    }
  }
  return 0;
}

function str(row: Record<string, any>, ...keys: string[]): string {
  for (const k of keys) {
    const v = row[k];
    if (v != null && String(v).trim() !== '') return String(v).trim();
  }
  return '';
}

export function calculateProcurementMetrics(rows: Record<string, any>[]) {
  if (!rows || rows.length === 0) {
    return {
      totalActions: 0,
      totalContractValue: 0,
      smallBizActions: 0,
      smallBizPct: 0,
      expiringNext180Days: 0,
      topVehicles: [],
      topVendors: [],
      topNAICS: [],
      topPSC: [],
      error: 'No data rows found'
    };
  }
  
  // Normalize keys to lowercase for deterministic lookups
  const lower = (o: Record<string, any>) => {
    const m: Record<string, any> = {};
    for (const k of Object.keys(o)) m[k.toLowerCase()] = o[k];
    return m;
  };

  // Amount priority tuned to DOC CSVs (USASpending-style)
  const amountPriority = [
    'total_obligated_amount',                 // primary driver
    'current_total_value_of_award',
    'potential_total_value_of_award',
    // also support common alternates
    'federal_action_obligation','dollars_obligated','obligated_amount','obligation',
    'action_obligation','base_exercised_options_value','base_and_all_options_value',
    // generic fallbacks
    'total_value','contract_value','current_total_value','award_amount','funding_amount','amount','value_of_contract',
  ].map(s => s.toLowerCase());

  const smallBizStringSignals = [
    // Primary authoritative field in USAspending extracts
    'contracting_officers_determination_of_business_size', // "SMALL BUSINESS" / "OTHER THAN SMALL"
    'type_of_set_aside',                                   // may include "SMALL BUSINESS"
  ];
  // Only category flags that positively imply SB status (do NOT use recipient_small_business)
  const smallBizBoolFlags = [
    'women_owned_small_business',
    'economically_disadvantaged_women_owned_small_business',
    'service_disabled_veteran_owned_business',
    'veteran_owned_business',
    'historically_underutilized_business_zone_hubzone_firm',
    'small_disadvantaged_business',
    'sba_certified_8a_joint_venture',
    'entity_small_business', 'is_small_business'
  ];

  const vendorFields = ['recipient_name','recipient_name_raw','recipient_parent_name'];
  const naicsFields = ['naics_code','naics'];
  const pscFields = ['product_or_service_code','psc','psc_code','productorservicecode'];

  const endDateFields = [
    'period_of_performance_current_end_date',
    'ordering_period_end_date',
    // past variants
    'periodofperformancecurrentenddate','pop_end','end_date'
  ];

  const totals = { tcv: 0, actions: rows.length, smallBizActions: 0 };
  const vehicles: Record<string, number> = {};
  const vendors: Record<string, number> = {};
  const naics: Record<string, number> = {};
  const psc: Record<string, number> = {};
  let expiringNext180 = 0;

  const now = Date.now();
  const in180 = 1000 * 60 * 60 * 24 * 180;

  const amountRegex = /(oblig|value|amount|dollar|ceiling|total)/i;

  for (const r0 of rows) {
    const r = lower(r0);
    // primary: ordered priority
    let amt = num(r, amountPriority);
    // fallback: scan any column that looks like an amount
    if (amt === 0) {
      for (const [k, v] of Object.entries(r)) {
        if (!amountRegex.test(k)) continue;
        const parsed = Number(String(v).replace(/[^\d.-]/g, ''));
        if (!Number.isNaN(parsed)) { amt = Math.max(amt, parsed); }
      }
    }
    totals.tcv += amt;

    // small business: authoritative string > category flags; never infer from recipient_small_business
    let sb = false;
    const det = String(r['contracting_officers_determination_of_business_size'] ?? '').toUpperCase();
    if (det.includes('OTHER THAN SMALL')) {
      sb = false;
    } else if (det.includes('SMALL')) {
      sb = true;
    } else {
      // fall back to specific category flags (any true → SB)
      for (const f of smallBizBoolFlags) {
        const v = String(r[f] ?? '').toLowerCase();
        if (v === 'true' || v === 't' || v === '1' || v === 'yes' || v === 'y') { sb = true; break; }
      }
      // loose textual signal in type_of_set_aside if still undecided
      if (!sb) {
        const ts = String(r['type_of_set_aside'] ?? '').toUpperCase();
        if (ts.includes('SMALL BUS')) sb = true;
      }
    }
    if (sb) totals.smallBizActions++;

    // Vehicle inference: use idv_type; otherwise map award_type to a vehicle family
    const idvType = str(r, 'idv_type').toUpperCase();
    const awardType = str(r, 'award_type').toUpperCase();
    const parentType = str(r, 'parent_award_type').toUpperCase();
    let veh = '';
    if (idvType) {
      veh = idvType; // e.g., BPA, IDC
    } else if (awardType) {
      if (awardType.includes('BPA')) veh = 'BPA';
      else if (awardType.includes('DELIVERY ORDER')) veh = 'IDC';
      else if (awardType.includes('DEFINITIVE')) veh = 'DEFINITIVE';
    } else if (parentType) {
      if (parentType.includes('BPA')) veh = 'BPA';
      else if (parentType.includes('IDC') || parentType.includes('IDIQ') || parentType.includes('INDEFINITE DELIVERY')) veh = 'IDC';
    }
    if (veh) vehicles[veh] = (vehicles[veh] ?? 0) + amt;

    const venKey = vendorFields.find(f => r[f] != null);
    const ven = String(r[venKey ?? ''] ?? '').trim();
    if (ven) vendors[ven] = (vendors[ven] ?? 0) + amt;

    const naKey = naicsFields.find(f => r[f] != null);
    const n = String(r[naKey ?? ''] ?? '').trim();
    if (n) naics[n] = (naics[n] ?? 0) + amt;

    const psKey = pscFields.find(f => r[f] != null);
    const p = String(r[psKey ?? ''] ?? '').trim();
    if (p) psc[p] = (psc[p] ?? 0) + amt;

    const edKey = endDateFields.find(f => r[f] != null);
    const edRaw = r[edKey ?? ''];
    const ed = edRaw ? Date.parse(String(edRaw)) : NaN;
    if (!Number.isNaN(ed) && ed > now && ed - now <= in180) expiringNext180 += amt;
  }

  const top = (obj: Record<string, number>, n = 10) =>
    Object.entries(obj).sort((a, b) => b[1] - a[1]).slice(0, n).map(([k, v]) => ({ key: k, amount: v }));

  const smallBizPct = totals.actions ? (totals.smallBizActions / totals.actions) : 0;

  const result = {
    totalActions: totals.actions,
    totalContractValue: totals.tcv,
    smallBizActions: totals.smallBizActions,
    smallBizPct,
    expiringNext180,
    expiringNext180Days: expiringNext180, // alias used by UI
    total_value: totals.tcv, // alias for compatibility
    active_contracts: totals.actions,
    small_business_percentage: Math.round(smallBizPct * 100),
    growth_rate: 12.5, // placeholder
    topVehicles: top(vehicles, 8),
    topVendors: top(vendors, 12),
    topNAICS: top(naics, 10),
    top_naics: top(naics, 3).map(x => x.key),  // FIX: Use top 3 by amount
    topPSC: top(psc, 10),
    dataQuality: {
      rowsProcessed: rows.length,
      hasAmounts: totals.tcv > 0,
      hasVendors: Object.keys(vendors).length > 0,
      hasVehicles: Object.keys(vehicles).length > 0,
    }
  };
  return result;
}

// Additional utility functions for ingestion service
export function calculateCAGR(values: number[]): number {
  if (values.length < 2) return 0;
  const first = values[0];
  const last = values[values.length - 1];
  if (first === 0) return 0;
  return Math.pow(last / first, 1 / (values.length - 1)) - 1;
}

export function calculateHHI(values: number[]): number {
  const total = values.reduce((sum, val) => sum + val, 0);
  if (total === 0) return 0;
  return values.reduce((sum, val) => sum + Math.pow(val / total, 2), 0);
}

export function getTopItems(items: Array<{key: string, amount: number}>, count: number = 5): string[] {
  return items
    .sort((a, b) => b.amount - a.amount)
    .slice(0, count)
    .map(item => item.key);
}

export function calculatePercentile(values: number[], percentile: number): number {
  const sorted = [...values].sort((a, b) => a - b);
  const index = Math.ceil((percentile / 100) * sorted.length) - 1;
  return sorted[Math.max(0, index)] || 0;
}

export function getFiscalYear(date: Date): number {
  const year = date.getFullYear();
  const month = date.getMonth() + 1; // 0-indexed
  return month >= 10 ? year + 1 : year;
}

export function getFiscalQuarter(date: Date): number {
  const month = date.getMonth() + 1; // 0-indexed
  if (month >= 10) return 1; // Q1: Oct-Dec
  if (month >= 7) return 4;  // Q4: Jul-Sep
  if (month >= 4) return 3;  // Q3: Apr-Jun
  return 2; // Q2: Jan-Mar
}

export function identifyRecompetes(contracts: Array<{endDate: string, value: number}>): number {
  const now = new Date();
  const sixMonthsFromNow = new Date(now.getTime() + (6 * 30 * 24 * 60 * 60 * 1000));
  
  return contracts.reduce((total, contract) => {
    const endDate = new Date(contract.endDate);
    if (endDate >= now && endDate <= sixMonthsFromNow) {
      return total + contract.value;
    }
    return total;
  }, 0);
}
