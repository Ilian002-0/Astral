import React, { useCallback, useState } from 'react';
import { Trade } from '../types';
import { useLanguage } from '../contexts/LanguageContext';
import { parseCSV } from '../utils/csvParser';

interface FileUploadProps {
  onFileProcessed: (data: Trade[], fileName: string) => void;
  onError: (error: string) => void;
}

const FileUpload: React.FC<FileUploadProps> = ({ onFileProcessed, onError }) => {
  const [isDragging, setIsDragging] = useState(false);
  const { t } = useLanguage();

  const handleFile = useCallback((file: File) => {
    if (!file) {
      onError("No file selected.");
      return;
    }
    if (file.type !== 'text/csv' && !file.name.toLowerCase().endsWith('.csv')) {
      onError("Invalid file type. Please upload a CSV file.");
      return;
    }

    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const content = event.target?.result as string;
        const parsedData = parseCSV(content);
        onFileProcessed(parsedData, file.name);
      } catch (error) {
        if (error instanceof Error) {
          onError(error.message);
        } else {
          onError("An unknown error occurred during file parsing.");
        }
      }
    };
    reader.onerror = () => {
      onError("Failed to read the file.");
    };
    reader.readAsText(file);
  }, [onFileProcessed, onError]);

  const onDragEnter = (e: React.DragEvent<HTMLLabelElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(true);
  };
  const onDragLeave = (e: React.DragEvent<HTMLLabelElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
  };
  const onDragOver = (e: React.DragEvent<HTMLLabelElement>) => {
    e.preventDefault();
    e.stopPropagation();
  };
  const onDrop = (e: React.DragEvent<HTMLLabelElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      handleFile(e.dataTransfer.files[0]);
    }
  };

  const onFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      handleFile(e.target.files[0]);
    }
  };

  return (
    <div className="w-full max-w-3xl mx-auto text-center">
      <h2 className="text-xl font-bold mb-2 text-white">{t('file_upload.title')}</h2>
      <p className="text-gray-400 mb-4 text-sm">{t('file_upload.subtitle')}</p>
      <label
        onDragEnter={onDragEnter}
        onDragLeave={onDragLeave}
        onDragOver={onDragOver}
        onDrop={onDrop}
        className={`relative block w-full p-8 border-2 border-dashed rounded-lg cursor-pointer transition-colors duration-300 ${isDragging ? 'border-cyan-400 bg-gray-700' : 'border-gray-500 hover:border-cyan-500 hover:bg-gray-700/50'}`}
      >
        <div className="flex flex-col items-center justify-center space-y-4">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-10 w-10 text-gray-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
              <path strokeLinecap="round" strokeLinejoin="round" d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
            </svg>
            <span className="text-gray-400">{isDragging ? t('file_upload.drop_prompt') : t('file_upload.click_prompt')}</span>
        </div>
        <input
          type="file"
          id="file-upload"
          className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
          accept=".csv"
          onChange={onFileChange}
        />
      </label>
    </div>
  );
};

export default FileUpload;