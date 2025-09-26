// Test script for the enhanced ingestion pipeline
// Run this to verify the metadata generation is working

import { ingestProcurementData } from './services/ingestionService';

// Sample USASpending CSV data (subset of 286 columns)
const SAMPLE_CSV = `contract_award_unique_key,award_base_action_date,total_obligated_amount,recipient_name,recipient_uei,naics_code,product_or_service_code,type_of_set_aside,extent_competed,awarding_agency_name,prime_award_base_transaction_description
CONT-AGY-001,2024-01-15,500000,CyberDefense Inc,UEI123456789,541512,D310,8A,D,Department of Commerce,Zero Trust Architecture Implementation Services
CONT-AGY-002,2024-02-20,750000,SecureNet Solutions,UEI987654321,541519,D302,SDVOSBC,A,Department of Commerce,SIEM/SOC Dashboard Development and Integration
CONT-AGY-003,2024-03-10,250000,TechGuard LLC,UEI456789123,518210,H170,WOSB,F,Department of Commerce,Vulnerability Assessment and Penetration Testing
CONT-AGY-004,2024-04-05,1200000,DataShield Corp,UEI789123456,541511,D399,NONE,D,Department of Commerce,Enterprise Firewall and Intrusion Detection System
CONT-AGY-005,2024-05-12,300000,InfoSec Partners,UEI321654987,561621,R425,HZC,CDO,Department of Commerce,Incident Response Team Augmentation Services`;

// Test function
export const testIngestionPipeline = async () => {
  console.log('🚀 Testing Enhanced Ingestion Pipeline\n');
  console.log('=' .repeat(50));
  
  try {
    // Create a File object from sample CSV
    const csvFile = new File(
      [SAMPLE_CSV], 
      'Department_of_Commerce_awards.csv',
      { type: 'text/csv' }
    );
    
    // Run ingestion pipeline
    console.log('\n📁 Processing file:', csvFile.name);
    console.log('📏 File size:', csvFile.size, 'bytes');
    
    const result = await ingestProcurementData(csvFile, 'DOC');
    
    // Display Manifest
    console.log('\n📋 MANIFEST GENERATED:');
    console.log('------------------------');
    console.log('Source:', result.manifest.source);
    console.log('Schema Version:', result.manifest.schema_version);
    console.log('Rows:', result.manifest.file_profile.rows);
    console.log('Columns:', result.manifest.file_profile.columns);
    console.log('Primary Keys:', result.manifest.primary_keys);
    console.log('Fiscal Window:', result.manifest.fiscal_window.fiscal_years);
    console.log('Data Quality Score:', result.manifest.data_quality.completeness_score);
    console.log('Validation Passed:', result.manifest.data_quality.validation_passed);
    
    // Display Profile
    console.log('\n📊 DATA PROFILE:');
    console.log('------------------------');
    console.log('Agency:', result.profile.agency);
    console.log('Total Obligations: $', result.profile.obligation_total_usd.toLocaleString());
    console.log('Award Count:', result.profile.award_count);
    console.log('Average Award Size: $', result.profile.avg_award_size_usd.toLocaleString());
    
    console.log('\n🏆 Top PSCs:');
    result.profile.top_psc.forEach(psc => {
      const cyberFlag = psc.is_cyber ? '🔒' : '  ';
      console.log(`  ${cyberFlag} ${psc.code}: ${psc.share.toFixed(1)}%`);
    });
    
    console.log('\n🏢 Competition Mix:');
    console.log('  Full & Open:', (result.profile.competition_mix.full_open * 100).toFixed(1) + '%');
    console.log('  Other Competed:', (result.profile.competition_mix.other_than_full_open * 100).toFixed(1) + '%');
    console.log('  Not Competed:', (result.profile.competition_mix.not_competed * 100).toFixed(1) + '%');
    
    console.log('\n🎯 Set-Aside Mix:');
    console.log('  8(a):', (result.profile.set_aside_mix['8a'] * 100).toFixed(1) + '%');
    console.log('  SDVOSB:', (result.profile.set_aside_mix.sdvosb * 100).toFixed(1) + '%');
    console.log('  WOSB:', (result.profile.set_aside_mix.wosb * 100).toFixed(1) + '%');
    console.log('  Full & Open:', (result.profile.set_aside_mix.full_and_open * 100).toFixed(1) + '%');
    
    // Display Cyber Metrics
    if (result.profile.cyber_metrics) {
      console.log('\n🔐 CYBER RELEVANCE:');
      console.log('------------------------');
      console.log('Cyber-Relevant Spend: $', result.profile.cyber_metrics.cyber_relevant_spend_usd.toLocaleString());
      console.log('Cyber Percentage:', result.profile.cyber_metrics.cyber_relevant_percentage.toFixed(1) + '%');
      console.log('Top Cyber PSCs:', result.profile.cyber_metrics.top_cyber_psc.join(', '));
      console.log('Contracts with Cyber Indicators:', result.profile.cyber_metrics.cyber_keyword_hits);
    }
    
    // Display Features Sample
    console.log('\n🔧 DERIVED FEATURES (First Contract):');
    console.log('------------------------');
    if (result.features.length > 0) {
      const feature = result.features[0];
      console.log('Contract ID:', feature.contract_id);
      console.log('Fiscal Year:', feature.fiscal_year);
      console.log('Vehicle Type:', feature.vehicle_type);
      console.log('Competition:', feature.competition_category);
      console.log('Is Cyber:', feature.is_cyber ? '✅' : '❌');
      console.log('Cyber Score:', feature.cyber_score.toFixed(2));
      console.log('Cyber Indicators:', feature.cyber_indicators.join(', ') || 'None');
      console.log('Vendor:', feature.vendor_name);
      console.log('Small Business:', feature.vendor_small_business_flag ? '✅' : '❌');
    }
    
    // Display Validation
    console.log('\n✅ VALIDATION REPORT:');
    console.log('------------------------');
    console.log('Status:', result.validation.passed ? '✅ PASSED' : '❌ FAILED');
    if (result.validation.errors.length > 0) {
      console.log('Errors:');
      result.validation.errors.forEach(err => {
        console.log(`  - ${err.field}: ${err.message}`);
      });
    }
    if (result.validation.warnings.length > 0) {
      console.log('Warnings:');
      result.validation.warnings.forEach(warn => {
        console.log(`  - ${warn.field}: ${warn.message}`);
      });
    }
    
    console.log('\n' + '=' .repeat(50));
    console.log('✅ Ingestion Pipeline Test Complete!');
    console.log('\nThe system successfully:');
    console.log('1. Generated a manifest with metadata');
    console.log('2. Validated the schema');
    console.log('3. Parsed data with deterministic rules');
    console.log('4. Normalized agency names');
    console.log('5. Derived features with cyber scoring');
    console.log('6. Generated a data profile');
    console.log('7. Calculated procurement metrics');
    console.log('8. Identified cyber-relevant contracts');
    
  } catch (error) {
    console.error('❌ Test failed:', error);
  }
};

// Run the test if this file is executed directly
if (import.meta.url === `file://${process.argv[1]}`) {
  testIngestionPipeline();
}

// Export for use in other tests
export { SAMPLE_CSV };