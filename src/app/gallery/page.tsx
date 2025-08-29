"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import {
  Heart,
  Image as ImageIcon,
  Calendar,
  Download,
  ArrowLeft,
} from "lucide-react";
import Link from "next/link";
import ThemeToggle from "../components/ThemeToggle";

interface Photo {
  id: string;
  name: string;
  url: string;
  size: number;
  uploadedAt: string;
  key: string;
}

interface PhotosResponse {
  photos: Photo[];
  count: number;
  hasMore: boolean;
}

export default function Gallery() {
  const [photos, setPhotos] = useState<Photo[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedPhoto, setSelectedPhoto] = useState<Photo | null>(null);
  const [hasMore, setHasMore] = useState(true);
  const [page, setPage] = useState(1);
  const observerRef = useRef<IntersectionObserver | null>(null);
  const loadingRef = useRef<HTMLDivElement>(null);

  const ITEMS_PER_PAGE = 12;

  useEffect(() => {
    fetchPhotos();
  }, []);

  // Set up intersection observer for infinite scroll
  useEffect(() => {
    if (loadingRef.current) {
      observerRef.current = new IntersectionObserver(
        (entries) => {
          if (entries[0].isIntersecting && hasMore && !loadingMore) {
            loadMorePhotos();
          }
        },
        { threshold: 0.1 }
      );

      observerRef.current.observe(loadingRef.current);
    }

    return () => {
      if (observerRef.current) {
        observerRef.current.disconnect();
      }
    };
  }, [hasMore, loadingMore]);

  const fetchPhotos = async (isLoadMore = false) => {
    try {
      if (isLoadMore) {
        setLoadingMore(true);
      } else {
        setLoading(true);
      }

      const response = await fetch(`/api/photos?maxKeys=${ITEMS_PER_PAGE}`);
      if (!response.ok) {
        throw new Error("Failed to fetch photos");
      }

      const data: PhotosResponse = await response.json();

      if (isLoadMore) {
        setPhotos((prev) => [...prev, ...data.photos]);
      } else {
        setPhotos(data.photos || []);
      }

      setHasMore(data.hasMore || false);
      setPage((prev) => prev + 1);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load photos");
    } finally {
      setLoading(false);
      setLoadingMore(false);
    }
  };

  const loadMorePhotos = useCallback(() => {
    if (!loadingMore && hasMore) {
      fetchPhotos(true);
    }
  }, [loadingMore, hasMore]);

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return "0 Bytes";
    const k = 1024;
    const sizes = ["Bytes", "KB", "MB", "GB"];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + " " + sizes[i];
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString("en-US", {
      year: "numeric",
      month: "long",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const downloadPhoto = (photo: Photo) => {
    const link = document.createElement("a");
    link.href = photo.url;
    link.download = photo.name;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Generate random rotation for Polaroid effect
  const getRandomRotation = () => {
    return Math.random() * 20 - 10; // Random between -10 and 10 degrees
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-[var(--background)] via-[var(--background)] to-[var(--card-bg)] flex items-center justify-center">
        <div className="text-center">
          <div className="w-8 h-8 border-4 border-[var(--accent-primary)] border-t-transparent rounded-full animate-spin mx-auto mb-4" />
          <p className="text-[var(--text-secondary)]">Loading photos...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-[var(--background)] via-[var(--background)] to-[var(--card-bg)]">
      <ThemeToggle />
      <div className="container mx-auto px-4 py-8">
        {/* Header */}
        <div className="text-center mb-8">
          <Link
            href="/"
            className="inline-flex items-center gap-2 text-[var(--accent-primary)] hover:text-[var(--accent-hover)] mb-4"
          >
            <ArrowLeft className="w-4 h-4" />
            Back to Upload
          </Link>
          <div className="flex items-center justify-center gap-3 mb-4">
            <Heart className="w-8 h-8 text-[var(--accent-primary)]" />
            <h1 className="font-better-saturday text-4xl font-bold bg-gradient-to-r from-[var(--accent-primary)] to-[var(--accent-secondary)] bg-clip-text text-transparent">
              Photo Gallery
            </h1>
            <Heart className="w-8 h-8 text-[var(--accent-primary)]" />
          </div>
          <p className="text-lg text-[var(--text-secondary)]">
            All the beautiful moments shared by friends and family
          </p>
        </div>

        {/* Error Message */}
        {error && (
          <div className="max-w-4xl mx-auto mb-8">
            <div className="bg-[var(--error-bg)] border border-[var(--error-border)] rounded-lg p-4 text-center">
              <p className="text-[var(--error-text)]">{error}</p>
              <button
                onClick={() => fetchPhotos()}
                className="mt-2 text-[var(--error-text)] hover:opacity-80 underline"
              >
                Try again
              </button>
            </div>
          </div>
        )}

        {/* Photo Grid */}
        <div className="max-w-6xl mx-auto">
          {photos.length === 0 ? (
            <div className="text-center py-12">
              <ImageIcon className="w-16 h-16 text-[var(--text-muted)] mx-auto mb-4" />
              <h3 className="text-xl font-medium text-[var(--text-primary)] mb-2">
                No photos yet
              </h3>
              <p className="text-[var(--text-secondary)] mb-6">
                Be the first to share a photo from the engagement celebration!
              </p>
              <Link
                href="/"
                className="bg-gradient-to-r from-[var(--accent-primary)] to-[var(--accent-secondary)] text-white px-6 py-3 rounded-full font-medium hover:from-[var(--accent-hover)] hover:to-[var(--accent-secondary)] transition-all"
              >
                Upload Photos
              </Link>
            </div>
          ) : (
            <>
              <div className="grid grid-cols-1 p-3 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-8">
                {photos.map((photo, index) => (
                  <div
                    key={photo.id}
                    className="group cursor-pointer transform hover:scale-105 transition-transform duration-300"
                    style={{ transform: `rotate(${getRandomRotation()}deg)` }}
                    onClick={() => setSelectedPhoto(photo)}
                  >
                    {/* Polaroid Container */}
                    <div className="bg-[var(--card-bg)] p-3 pb-8 rounded-sm shadow-lg hover:shadow-2xl transition-shadow duration-300 border border-[var(--card-border)]">
                      {/* Image Container */}
                      <div className="aspect-square bg-[var(--input-bg)] relative overflow-hidden mb-3">
                        <img
                          src={photo.url}
                          alt={photo.name}
                          className="w-full h-full object-cover"
                        />
                        <div className="absolute inset-0 bg-black bg-opacity-0 group-hover:bg-opacity-20 transition-all duration-300 flex items-center justify-center">
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              downloadPhoto(photo);
                            }}
                            className="bg-[var(--accent-primary)] text-white p-2 rounded-full opacity-0 group-hover:opacity-100 transition-opacity duration-300 hover:bg-[var(--accent-hover)]"
                          >
                            <Download className="w-4 h-4" />
                          </button>
                        </div>
                      </div>

                      {/* Polaroid Caption Area */}
                      <div className="px-2">
                        <p className="text-sm font-medium text-[var(--text-primary)] truncate mb-1">
                          {photo.name}
                        </p>
                        <div className="flex items-center justify-between text-xs text-[var(--text-muted)]">
                          <div className="flex items-center gap-1">
                            <Calendar className="w-3 h-3" />
                            {formatDate(photo.uploadedAt)}
                          </div>
                          <span>{formatFileSize(photo.size)}</span>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              {/* Loading More Indicator */}
              {loadingMore && (
                <div className="text-center py-8">
                  <div className="w-6 h-6 border-2 border-[var(--accent-primary)] border-t-transparent rounded-full animate-spin mx-auto mb-2" />
                  <p className="text-[var(--text-secondary)] text-sm">
                    Loading more photos...
                  </p>
                </div>
              )}

              {/* Intersection Observer Target */}
              {hasMore && !loadingMore && (
                <div ref={loadingRef} className="h-4" />
              )}

              {/* End of Photos Message */}
              {!hasMore && photos.length > 0 && (
                <div className="text-center py-8">
                  <p className="text-[var(--text-muted)] text-sm">
                    You've reached the end of all photos!
                  </p>
                </div>
              )}
            </>
          )}
        </div>

        {/* Photo Count */}
        {photos.length > 0 && (
          <div className="text-center mt-8 text-[var(--text-secondary)]">
            <p>
              {photos.length} photo{photos.length !== 1 ? "s" : ""} shared
            </p>
          </div>
        )}
      </div>

      {/* Photo Modal */}
      {selectedPhoto && (
        <div
          className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-50 p-4"
          onClick={() => setSelectedPhoto(null)}
        >
          <div className="relative max-w-4xl max-h-full">
            <img
              src={selectedPhoto.url}
              alt={selectedPhoto.name}
              className="max-w-full max-h-full object-contain rounded-lg"
              onClick={(e) => e.stopPropagation()}
            />
            <div className="absolute top-4 right-4 flex gap-2">
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  downloadPhoto(selectedPhoto);
                }}
                className="bg-[var(--accent-primary)] text-white p-2 rounded-full hover:bg-[var(--accent-hover)] transition-colors"
              >
                <Download className="w-5 h-5" />
              </button>
              <button
                onClick={() => setSelectedPhoto(null)}
                className="bg-[var(--accent-primary)] text-white p-2 rounded-full hover:bg-[var(--accent-hover)] transition-colors"
              >
                ×
              </button>
            </div>
            <div className="absolute bottom-4 left-4 right-4 bg-black bg-opacity-50 text-white p-3 rounded-lg">
              <p className="font-medium">{selectedPhoto.name}</p>
              <p className="text-sm opacity-90">
                {formatDate(selectedPhoto.uploadedAt)} •{" "}
                {formatFileSize(selectedPhoto.size)}
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
