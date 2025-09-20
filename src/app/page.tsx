"use client";

import { useState, useCallback, useEffect } from "react";
import {
  Upload,
  Camera,
  Heart,
  Users,
  CheckCircle,
  AlertCircle,
} from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import NameEntryModal from "./components/NameEntryModal";
import NameChangeButton from "./components/NameChangeButton";
import { useUser } from "./contexts/UserContext";

interface UploadedFile {
  id: string;
  name: string;
  url: string;
  uploadedAt: Date;
}

export default function Home() {
  const [files, setFiles] = useState<File[]>([]);
  const [uploadedFiles, setUploadedFiles] = useState<UploadedFile[]>([]);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState<{
    [key: string]: number;
  }>({});
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [showNameModal, setShowNameModal] = useState(false);

  const { userName, hasEnteredName } = useUser();

  // Show name modal for first-time visitors
  useEffect(() => {
    if (!hasEnteredName) {
      setShowNameModal(true);
    }
  }, [hasEnteredName]);

  const onDrop = useCallback((acceptedFiles: File[]) => {
    console.log(
      "Files received:",
      acceptedFiles.map((f) => ({ name: f.name, type: f.type }))
    );
    const mediaFiles = acceptedFiles.filter(
      (file) => file.type.startsWith("image/") || file.type.startsWith("video/")
    );
    console.log(
      "Filtered media files:",
      mediaFiles.map((f) => ({ name: f.name, type: f.type }))
    );
    setFiles((prev) => [...prev, ...mediaFiles]);
    setError(null);
  }, []);

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFiles = Array.from(event.target.files || []);
    console.log(
      "Selected files:",
      selectedFiles.map((f) => ({ name: f.name, type: f.type }))
    );
    onDrop(selectedFiles);
  };

  const removeFile = (index: number) => {
    setFiles((prev) => prev.filter((_, i) => i !== index));
  };

  const uploadFiles = async () => {
    if (files.length === 0) return;

    setIsUploading(true);
    setError(null);
    setSuccess(null);
    setUploadProgress({});

    try {
      for (let i = 0; i < files.length; i++) {
        const file = files[i];
        const formData = new FormData();
        formData.append("file", file);
        formData.append("userName", userName || "");

        setUploadProgress((prev) => ({ ...prev, [file.name]: 0 }));

        const response = await fetch("/api/upload", {
          method: "POST",
          body: formData,
        });

        if (!response.ok) {
          console.log(response);

          throw new Error(`Failed to upload ${file.name}`);
        }

        const result = await response.json();

        setUploadedFiles((prev) => [
          ...prev,
          {
            id: result.id,
            name: file.name,
            url: result.url,
            uploadedAt: new Date(),
          },
        ]);

        setUploadProgress((prev) => ({ ...prev, [file.name]: 100 }));
      }

      setFiles([]);
      setSuccess(
        `${files.length} file${
          files.length > 1 ? "s" : ""
        } uploaded successfully!`
      );
    } catch (err) {
      setError(err instanceof Error ? err.message : "Upload failed");
    } finally {
      setIsUploading(false);
      setUploadProgress({});
    }
  };

  return (
    <div className="min-h-screen ">
      <div className="flex justify-start items-center p-4">
        <NameChangeButton />
      </div>
      <div className="container mx-auto px-4 py-8">
        <div className="text-center mb-12">
          <div className="flex items-center justify-center gap-3 mb-4">
            {/* <Heart className="w-8 h-8 text-[var(--accent-primary)]" /> */}
            <h1 className="font-better-saturday px-5 text-5xl font-bold bg-gradient-to-r from-[var(--accent-primary)] to-[var(--accent-secondary)] bg-clip-text text-transparent">
              Omar and Lynn Engagement
            </h1>
            {/* <Heart className="w-8 h-8 text-[var(--accent-primary)]" /> */}
          </div>
          <p className="text-lg text-[var(--accent-primary)] font-arimo  max-w-2xl mx-auto">
            Share your special moments with us! Upload photos from your
            engagement celebration and create beautiful memories together.
          </p>
        </div>

        {/* Upload Section */}
        <div className="max-w-4xl mx-auto">
          <div className="bg-[var(--card-bg)] opacity-60 rounded-2xl shadow-xl p-8 mb-8 border border-[var(--card-border)]">
            <div className="text-center mb-6">
              <Camera className="w-12 h-12 text-[var(--accent-primary)] mx-auto mb-4" />
              <h2 className="text-2xl font-semibold text-[var(--text-primary)] mb-2">
                Upload Your Photos & Videos
              </h2>
              <p className="text-[var(--text-secondary)]">
                Select photos and videos from your engagement celebration to
                share with everyone
              </p>
            </div>

            {/* File Uload */}
            <div className="border-2 border-dashed border-[var(--accent-primary)] rounded-xl p-8 text-center hover:border-[var(--accent-hover)] transition-colors">
              <input
                type="file"
                multiple
                accept="image/*,video/*,.mp4,.mov,.avi,.webm,.mkv,.wmv,.flv,.m4v"
                onChange={handleFileSelect}
                className="hidden"
                id="file-upload"
                disabled={isUploading}
              />
              <label htmlFor="file-upload" className="cursor-pointer block">
                <Upload className="w-12 h-12 text-[var(--accent-primary)] mx-auto mb-4" />
                <p className="text-lg font-medium text-[var(--text-primary)] mb-2">
                  Click to select files or drag and drop
                </p>
                <p className="text-sm text-[var(--text-muted)]">
                  Supports JPG, PNG, GIF, MP4, MOV up to 40MB each
                </p>
              </label>
            </div>

            {/* Selected Files */}
            {files.length > 0 && (
              <div className="mt-6">
                <h3 className="text-lg font-medium text-[var(--text-primary)] mb-4">
                  Selected Files ({files.length})
                </h3>
                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                  {files.map((file, index) => (
                    <div key={index} className="relative group">
                      <div className="aspect-square bg-[var(--input-bg)] rounded-lg overflow-hidden">
                        {file.type.startsWith("video/") ? (
                          <video
                            src={URL.createObjectURL(file)}
                            className="w-full h-full object-cover"
                            muted
                          />
                        ) : (
                          <img
                            src={URL.createObjectURL(file)}
                            alt={file.name}
                            className="w-full h-full object-cover"
                          />
                        )}
                      </div>
                      <button
                        onClick={() => removeFile(index)}
                        className="absolute top-2 right-2 bg-red-800 text-white rounded-full p-1  md:opacity-0 group-hover:opacity-100 transition-opacity"
                      >
                        ×
                      </button>
                      <p className="text-xs text-[var(--text-secondary)] mt-1 truncate">
                        {file.name}
                      </p>
                    </div>
                  ))}
                </div>

                <div className="mt-6 flex justify-center">
                  <button
                    onClick={uploadFiles}
                    disabled={isUploading}
                    className="bg-gradient-to-r from-[var(--accent-primary)] to-[var(--accent-secondary)] text-white px-8 py-3 rounded-full font-medium hover:from-[var(--accent-hover)] hover:to-[var(--accent-secondary)] transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                  >
                    {isUploading ? (
                      <>
                        <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                        Uploading...
                      </>
                    ) : (
                      <>
                        <Upload className="w-4 h-4" />
                        Upload Files
                      </>
                    )}
                  </button>
                </div>
              </div>
            )}

            {/* Progress Indicators */}
            {Object.keys(uploadProgress).length > 0 && (
              <div className="mt-6 space-y-2">
                {Object.entries(uploadProgress).map(([fileName, progress]) => (
                  <div key={fileName} className="flex items-center gap-3">
                    <div className="flex-1 bg-[var(--progress-bg)] rounded-full h-2">
                      <div
                        className="bg-[var(--accent-primary)] h-2 rounded-full transition-all duration-300"
                        style={{ width: `${progress}%` }}
                      />
                    </div>
                    <span className="text-sm text-[var(--text-secondary)] min-w-[60px]">
                      {progress}%
                    </span>
                  </div>
                ))}
              </div>
            )}

            {/* Messages */}
            {error && (
              <div className="mt-4 flex items-center gap-2 text-[var(--error-text)] bg-[var(--error-bg)] p-3 rounded-lg border border-[var(--error-border)]">
                <AlertCircle className="w-5 h-5" />
                {error}
              </div>
            )}

            {success && (
              <div className="mt-4 flex items-center gap-2 text-[var(--success-text)] bg-[var(--success-bg)] p-3 rounded-lg border border-[var(--success-border)]">
                <CheckCircle className="w-5 h-5" />
                {success}
              </div>
            )}
          </div>

          {/* optional Uploaded Photos Gallery */}
          {/* {uploadedFiles.length > 0 && (
            <div className="bg-[var(--card-bg)] rounded-2xl shadow-xl p-8 border border-[var(--card-border)]">
              <div className="flex items-center gap-2 mb-6">
                <Users className="w-6 h-6 text-[var(--accent-primary)]" />
                <h2 className="text-2xl font-semibold text-[var(--text-primary)]">
                  Shared Photos ({uploadedFiles.length})
                </h2>
              </div>
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                {uploadedFiles.map((file) => (
                  <div key={file.id} className="group">
                    <div className="aspect-square bg-[var(--input-bg)] rounded-lg overflow-hidden">
                      <img
                        src={file.url}
                        alt={file.name}
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform"
                      />
                    </div>
                    <p className="text-xs text-[var(--text-secondary)] mt-1 truncate">
                      {file.name}
                    </p>
                    <p className="text-xs text-[var(--text-muted)]">
                      {file.uploadedAt.toLocaleDateString()}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          )} */}
        </div>

        {/* Footer */}
        <div className="text-center mt-12 text-[var(--accent-primary)]">
          <p className="mb-4">Made with ❤️ Omar and Lynn</p>
          {/* <Link
            href="/gallery"
            className="inline-flex items-center gap-2 text-[var(--accent-primary)] hover:text-[var(--accent-hover)] font-medium"
          >
            <Users className="w-4 h-4" />
            View All Photos
          </Link> */}
        </div>
      </div>

      {/* Name Entry Modal */}
      <NameEntryModal
        isOpen={showNameModal}
        onClose={() => setShowNameModal(false)}
      />
    </div>
  );
}
