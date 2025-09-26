
import React, { useState, useCallback, useMemo } from 'react';
import { UploadIcon, FileIcon, XCircleIcon } from './icons';

interface FileUploadProps {
  onFileChange: (files: File[]) => void;
}

const FileUpload: React.FC<FileUploadProps> = ({ onFileChange }) => {
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const [isDragging, setIsDragging] = useState(false);

  const addFiles = useCallback((filesToAdd: File[]) => {
    const currentFileNames = new Set(selectedFiles.map(f => f.name));
    const newUniqueFiles = filesToAdd.filter(f => !currentFileNames.has(f.name));

    if (newUniqueFiles.length > 0) {
        const updatedFiles = [...selectedFiles, ...newUniqueFiles];
        setSelectedFiles(updatedFiles);
        onFileChange(updatedFiles);
    }
  }, [selectedFiles, onFileChange]);

  const handleFileSelect = useCallback((event: React.ChangeEvent<HTMLInputElement>) => {
    if (event.target.files) {
      addFiles(Array.from(event.target.files));
    }
    // Reset input to allow selecting the same file again if removed
    event.target.value = '';
  }, [addFiles]);

  const handleDrop = useCallback((event: React.DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    event.stopPropagation();
    setIsDragging(false);
    if (event.dataTransfer.files && event.dataTransfer.files.length > 0) {
      const files = Array.from(event.dataTransfer.files).filter(
        (file: File) => file.type === 'text/plain' || file.type === 'text/markdown' || file.type === 'text/csv'
      );
      addFiles(files);
      event.dataTransfer.clearData();
    }
  }, [addFiles]);

  const handleDragOver = (event: React.DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    event.stopPropagation();
  };
  
  const handleDragEnter = (event: React.DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    event.stopPropagation();
    setIsDragging(true);
  };
  
  const handleDragLeave = (event: React.DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    event.stopPropagation();
    setIsDragging(false);
  };

  const handleRemoveFile = useCallback((fileNameToRemove: string) => {
    const updatedFiles = selectedFiles.filter(file => file.name !== fileNameToRemove);
    setSelectedFiles(updatedFiles);
    onFileChange(updatedFiles);
  }, [selectedFiles, onFileChange]);

  const fileList = useMemo(() => (
    selectedFiles.map((file) => (
      <div key={file.name} className="flex items-center bg-navy p-2 rounded text-sm text-light-slate">
        <FileIcon className="h-4 w-4 mr-2 text-brand-accent"/>
        <span className="truncate flex-grow" title={file.name}>{file.name}</span>
        <span className="ml-auto pl-2 text-slate text-xs flex-shrink-0">{(file.size / 1024).toFixed(2)} KB</span>
        <button
          onClick={() => handleRemoveFile(file.name)}
          className="ml-2 p-1 text-slate hover:text-lightest-slate flex-shrink-0 rounded-full focus:outline-none focus:ring-2 focus:ring-brand-accent/50"
          aria-label={`Remove ${file.name}`}
        >
          <XCircleIcon className="h-5 w-5"/>
        </button>
      </div>
    ))
  ), [selectedFiles, handleRemoveFile]);

  return (
    <div>
      <div
        onDrop={handleDrop}
        onDragOver={handleDragOver}
        onDragEnter={handleDragEnter}
        onDragLeave={handleDragLeave}
        className={`border-2 border-dashed rounded-lg p-8 text-center cursor-pointer transition-colors duration-300
          ${isDragging ? 'border-brand-accent bg-lightest-navy/20' : 'border-lightest-navy/50 hover:border-brand-accent'}
        `}
      >
        <input
          type="file"
          id="file-upload"
          multiple
          accept=".txt,.md,.csv"
          onChange={handleFileSelect}
          className="hidden"
        />
        <label htmlFor="file-upload" className="flex flex-col items-center cursor-pointer">
          <UploadIcon className="h-10 w-10 text-slate mb-2"/>
          <p className="text-lightest-slate">
            <span className="font-semibold text-brand-accent">Click to upload</span> or drag and drop
          </p>
          <p className="text-xs text-slate mt-1">TXT, MD, or CSV files</p>
        </label>
      </div>
      {selectedFiles.length > 0 && (
        <div className="mt-4 space-y-2">
          <h4 className="font-semibold text-light-slate">Selected Files:</h4>
          {fileList}
        </div>
      )}
    </div>
  );
};

export default FileUpload;
