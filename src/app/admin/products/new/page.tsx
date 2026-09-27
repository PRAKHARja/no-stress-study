"use client";

import {
  ChangeEvent,
  FormEvent,
  useEffect,
  useState,
} from "react";

import { useRouter } from "next/navigation";

type Category = {
  id: string;
  name: string;
  slug: string;
};

export default function NewProductPage() {
  const router = useRouter();

  const [categories, setCategories] = useState<Category[]>(
    []
  );

  const [title, setTitle] = useState("");
  const [slug, setSlug] = useState("");
  const [description, setDescription] = useState("");
  const [price, setPrice] = useState("");
  const [categoryId, setCategoryId] = useState("");

  const [pdfFile, setPdfFile] = useState<File | null>(
    null
  );

  const [thumbnailFile, setThumbnailFile] =
    useState<File | null>(null);

  const [thumbnailPreview, setThumbnailPreview] =
    useState<string | null>(null);

  const [loadingCategories, setLoadingCategories] =
    useState(true);

  const [uploading, setUploading] = useState(false);

  const [message, setMessage] = useState("");

  useEffect(() => {
    async function fetchCategories() {
      try {
        const response = await fetch(
          "/api/admin/categories"
        );

        if (!response.ok) {
          setMessage("Failed to load categories");
          return;
        }

        const data = await response.json();

        setCategories(data.categories || []);
      } catch {
        setMessage("Failed to load categories");
      } finally {
        setLoadingCategories(false);
      }
    }

    void fetchCategories();
  }, []);

  function handleTitleChange(value: string) {
    setTitle(value);

    setSlug(
      value
        .toLowerCase()
        .trim()
        .replace(/[^a-z0-9]+/g, "-")
        .replace(/(^-|-$)/g, "")
    );
  }

  function handlePdfChange(
    event: ChangeEvent<HTMLInputElement>
  ) {
    const file = event.target.files?.[0] || null;

    if (!file) {
      setPdfFile(null);
      return;
    }

    if (file.type !== "application/pdf") {
      setMessage("Only PDF files are allowed.");
      event.target.value = "";
      setPdfFile(null);
      return;
    }

    if (file.size > 20 * 1024 * 1024) {
      setMessage(
        "PDF must be smaller than 20 MB."
      );
      event.target.value = "";
      setPdfFile(null);
      return;
    }

    setMessage("");
    setPdfFile(file);
  }

  function handleThumbnailChange(
    event: ChangeEvent<HTMLInputElement>
  ) {
    const file = event.target.files?.[0] || null;

    if (!file) {
      setThumbnailFile(null);
      setThumbnailPreview(null);
      return;
    }

    const allowedTypes = [
      "image/jpeg",
      "image/png",
      "image/webp",
    ];

    if (!allowedTypes.includes(file.type)) {
      setMessage(
        "Only JPG, PNG, and WebP images are allowed."
      );

      event.target.value = "";
      setThumbnailFile(null);
      setThumbnailPreview(null);

      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      setMessage(
        "Thumbnail must be smaller than 5 MB."
      );

      event.target.value = "";
      setThumbnailFile(null);
      setThumbnailPreview(null);

      return;
    }

    setMessage("");
    setThumbnailFile(file);

    const previewUrl = URL.createObjectURL(file);

    setThumbnailPreview(previewUrl);
  }

  async function handleSubmit(
    event: FormEvent<HTMLFormElement>
  ) {
    event.preventDefault();

    setMessage("");

    if (!categoryId) {
      setMessage("Please select a category.");
      return;
    }

    if (!pdfFile) {
      setMessage("Please select a PDF.");
      return;
    }

    setUploading(true);

    try {
      let thumbnailKey: string | null = null;

      /*
       * Upload thumbnail first if one was selected.
       */
      if (thumbnailFile) {
        const thumbnailFormData = new FormData();

        thumbnailFormData.append(
          "file",
          thumbnailFile
        );

        const thumbnailResponse = await fetch(
          "/api/admin/products/upload-thumbnail",
          {
            method: "POST",
            body: thumbnailFormData,
          }
        );

        const thumbnailData =
          await thumbnailResponse.json();

        if (!thumbnailResponse.ok) {
          setMessage(
            thumbnailData.error ||
              "Thumbnail upload failed."
          );

          return;
        }

        thumbnailKey = thumbnailData.fileKey;
      }

      /*
       * Upload PDF.
       */
      const pdfFormData = new FormData();

      pdfFormData.append("file", pdfFile);

      const uploadResponse = await fetch(
        "/api/admin/products/upload",
        {
          method: "POST",
          body: pdfFormData,
        }
      );

      const uploadData = await uploadResponse.json();

      if (!uploadResponse.ok) {
        setMessage(
          uploadData.error ||
            "PDF upload failed."
        );

        return;
      }

      const fileKey = uploadData.fileKey;

      /*
       * Create product.
       */
      const productResponse = await fetch(
        "/api/admin/products",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            title,
            slug,
            description,
            price: Math.round(
              Number(price) * 100
            ),
            categoryId,
            fileKey,
            thumbnailKey,
          }),
        }
      );

      const productData =
        await productResponse.json();

      if (!productResponse.ok) {
        setMessage(
          productData.error ||
            "Failed to create product."
        );

        return;
      }

      setMessage(
        "Product created successfully!"
      );

      setTimeout(() => {
        router.push("/admin/products");
        router.refresh();
      }, 800);
    } catch (error) {
      console.error(error);

      setMessage(
        "Something went wrong."
      );
    } finally {
      setUploading(false);
    }
  }

  return (
    <div className="max-w-4xl">
      <div>
        <h1 className="text-3xl font-bold text-slate-900">
          Add Product
        </h1>

        <p className="mt-2 text-slate-600">
          Add a study material to your store.
        </p>
      </div>

      <form
        onSubmit={handleSubmit}
        className="mt-8 space-y-6"
      >
        {/* Basic Information */}
        <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
          <h2 className="text-xl font-semibold text-slate-900">
            Basic Information
          </h2>

          <div className="mt-6 space-y-5">
            {/* Title */}
            <div>
              <label className="mb-2 block text-sm font-medium text-slate-700">
                Product Title
              </label>

              <input
                type="text"
                value={title}
                onChange={(e) =>
                  handleTitleChange(
                    e.target.value
                  )
                }
                placeholder="e.g. DBMS Complete Notes"
                required
                className="w-full rounded-lg border border-slate-300 px-4 py-3 text-slate-900 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
              />
            </div>

            {/* Slug */}
            <div>
              <label className="mb-2 block text-sm font-medium text-slate-700">
                Slug
              </label>

              <input
                type="text"
                value={slug}
                onChange={(e) =>
                  setSlug(e.target.value)
                }
                required
                className="w-full rounded-lg border border-slate-300 px-4 py-3 text-slate-900 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
              />

              <p className="mt-1 text-xs text-slate-500">
                Used in the product URL.
              </p>
            </div>

            {/* Description */}
            <div>
              <label className="mb-2 block text-sm font-medium text-slate-700">
                Description
              </label>

              <textarea
                value={description}
                onChange={(e) =>
                  setDescription(
                    e.target.value
                  )
                }
                placeholder="Describe what is included..."
                rows={5}
                required
                className="w-full rounded-lg border border-slate-300 px-4 py-3 text-slate-900 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
              />
            </div>
          </div>
        </div>

        {/* Thumbnail */}
        <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
          <h2 className="text-xl font-semibold text-slate-900">
            Product Thumbnail
          </h2>

          <p className="mt-2 text-sm text-slate-500">
            Add an image that represents this study
            material.
          </p>

          <div className="mt-6">
            <input
              type="file"
              accept="image/jpeg,image/png,image/webp"
              onChange={handleThumbnailChange}
              className="block w-full rounded-lg border border-slate-300 bg-white p-3 text-sm text-slate-700"
            />

            <p className="mt-2 text-xs text-slate-500">
              JPG, PNG or WebP. Maximum size: 5 MB.
            </p>

            {thumbnailPreview && (
              <div className="mt-5 overflow-hidden rounded-xl border border-slate-200">
                <img
                  src={thumbnailPreview}
                  alt="Thumbnail preview"
                  className="h-64 w-full object-cover"
                />
              </div>
            )}
          </div>
        </div>

        {/* Pricing & Category */}
        <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
          <h2 className="text-xl font-semibold text-slate-900">
            Pricing & Category
          </h2>

          <div className="mt-6 grid gap-5 md:grid-cols-2">
            {/* Price */}
            <div>
              <label className="mb-2 block text-sm font-medium text-slate-700">
                Price (₹)
              </label>

              <input
                type="number"
                min="0"
                step="0.01"
                value={price}
                onChange={(e) =>
                  setPrice(e.target.value)
                }
                placeholder="199"
                required
                className="w-full rounded-lg border border-slate-300 px-4 py-3 text-slate-900 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
              />
            </div>

            {/* Category */}
            <div>
              <label className="mb-2 block text-sm font-medium text-slate-700">
                Category
              </label>

              <select
                value={categoryId}
                onChange={(e) =>
                  setCategoryId(
                    e.target.value
                  )
                }
                required
                disabled={loadingCategories}
                className="w-full rounded-lg border border-slate-300 bg-white px-4 py-3 text-slate-900 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
              >
                <option value="">
                  {loadingCategories
                    ? "Loading categories..."
                    : "Select a category"}
                </option>

                {categories.map(
                  (category) => (
                    <option
                      key={category.id}
                      value={category.id}
                    >
                      {category.name}
                    </option>
                  )
                )}
              </select>
            </div>
          </div>
        </div>

        {/* PDF */}
        <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
          <h2 className="text-xl font-semibold text-slate-900">
            Study Material PDF
          </h2>

          <p className="mt-2 text-sm text-slate-500">
            The PDF will be stored privately in
            Cloudflare R2.
          </p>

          <div className="mt-6">
            <input
              type="file"
              accept="application/pdf"
              onChange={handlePdfChange}
              className="block w-full rounded-lg border border-slate-300 bg-white p-3 text-sm text-slate-700"
            />

            {pdfFile && (
              <div className="mt-3 rounded-lg bg-slate-50 p-3 text-sm text-slate-700">
                Selected:{" "}
                <span className="font-medium">
                  {pdfFile.name}
                </span>
              </div>
            )}

            <p className="mt-2 text-xs text-slate-500">
              PDF only. Maximum size: 20 MB.
            </p>
          </div>
        </div>

        {/* Message */}
        {message && (
          <div className="rounded-lg border border-slate-200 bg-white p-4 text-sm text-slate-700 shadow-sm">
            {message}
          </div>
        )}

        {/* Submit */}
        <button
          type="submit"
          disabled={uploading}
          className="rounded-lg bg-blue-600 px-6 py-3 font-medium text-white transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {uploading
            ? "Uploading & Creating Product..."
            : "Create Product"}
        </button>
      </form>
    </div>
  );
}