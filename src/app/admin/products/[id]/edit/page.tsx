"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";

type Category = {
  id: string;
  name: string;
};

type Product = {
  id: string;
  title: string;
  slug: string;
  description: string;
  price: number;
  fileKey: string;
  thumbnailKey: string | null;
  categoryId: string;
};

export default function EditProductPage() {
  const params = useParams();
  const router = useRouter();

  const productId = params.id as string;

  const [product, setProduct] = useState<Product | null>(null);
  const [categories, setCategories] = useState<Category[]>([]);

  const [title, setTitle] = useState("");
  const [slug, setSlug] = useState("");
  const [description, setDescription] = useState("");
  const [price, setPrice] = useState("");
  const [categoryId, setCategoryId] = useState("");

  const [thumbnailFile, setThumbnailFile] =
    useState<File | null>(null);

  const [pdfFile, setPdfFile] =
    useState<File | null>(null);

  const [thumbnailPreview, setThumbnailPreview] =
    useState("");

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    async function loadData() {
      try {
        const [productResponse, categoriesResponse] =
          await Promise.all([
            fetch(`/api/admin/products/${productId}`),
            fetch("/api/admin/categories"),
          ]);

        if (!productResponse.ok) {
          throw new Error("Failed to load product");
        }

        if (!categoriesResponse.ok) {
          throw new Error("Failed to load categories");
        }

        const productData = await productResponse.json();
        const categoriesData =
          await categoriesResponse.json();

        const loadedProduct: Product =
          productData.product;

        setProduct(loadedProduct);
        setCategories(categoriesData.categories || []);

        setTitle(loadedProduct.title);
        setSlug(loadedProduct.slug);
        setDescription(loadedProduct.description);
        setPrice(
          (loadedProduct.price / 100).toString()
        );
        setCategoryId(loadedProduct.categoryId);
      } catch (err) {
        console.error(err);
        setError("Unable to load product.");
      } finally {
        setLoading(false);
      }
    }

    void loadData();
  }, [productId]);

  function handleThumbnailChange(
    file: File | null
  ) {
    setThumbnailFile(file);

    if (!file) {
      setThumbnailPreview("");
      return;
    }

    setThumbnailPreview(URL.createObjectURL(file));
  }

  async function uploadFile(
    endpoint: string,
    file: File
  ) {
    const formData = new FormData();
    formData.append("file", file);

    const response = await fetch(endpoint, {
      method: "POST",
      body: formData,
    });

    const data = await response.json();

    if (!response.ok) {
      throw new Error(
        data.error || "File upload failed"
      );
    }

    return data.fileKey as string;
  }

  async function handleSubmit(
    event: React.FormEvent<HTMLFormElement>
  ) {
    event.preventDefault();

    setError("");
    setSaving(true);

    try {
      if (!title.trim()) {
        throw new Error("Title is required");
      }

      if (!slug.trim()) {
        throw new Error("Slug is required");
      }

      if (!description.trim()) {
        throw new Error("Description is required");
      }

      if (!price || Number(price) < 0) {
        throw new Error("Enter a valid price");
      }

      if (!categoryId) {
        throw new Error("Please select a category");
      }

      let newThumbnailKey: string | undefined;
      let newFileKey: string | undefined;

      if (thumbnailFile) {
        if (
          ![
            "image/jpeg",
            "image/png",
            "image/webp",
          ].includes(thumbnailFile.type)
        ) {
          throw new Error(
            "Thumbnail must be JPG, PNG, or WebP"
          );
        }

        if (thumbnailFile.size > 5 * 1024 * 1024) {
          throw new Error(
            "Thumbnail must be smaller than 5 MB"
          );
        }

        newThumbnailKey = await uploadFile(
          "/api/admin/products/upload-thumbnail",
          thumbnailFile
        );
      }

      if (pdfFile) {
        if (pdfFile.type !== "application/pdf") {
          throw new Error(
            "Only PDF files are allowed"
          );
        }

        if (pdfFile.size > 20 * 1024 * 1024) {
          throw new Error(
            "PDF must be smaller than 20 MB"
          );
        }

        newFileKey = await uploadFile(
          "/api/admin/products/upload",
          pdfFile
        );
      }

      const response = await fetch(
        `/api/admin/products/${productId}`,
        {
          method: "PUT",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            title: title.trim(),
            slug: slug.trim(),
            description: description.trim(),
            price: Math.round(
              Number(price) * 100
            ),
            categoryId,
            ...(newThumbnailKey
              ? {
                  thumbnailKey:
                    newThumbnailKey,
                }
              : {}),
            ...(newFileKey
              ? {
                  fileKey: newFileKey,
                }
              : {}),
          }),
        }
      );

      const data = await response.json();

      if (!response.ok) {
        throw new Error(
          data.error || "Failed to update product"
        );
      }

      router.push("/admin/products");
      router.refresh();
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Something went wrong"
      );
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return (
      <div>
        <h1 className="text-3xl font-bold text-slate-900">
          Edit Product
        </h1>

        <p className="mt-3 text-slate-500">
          Loading product...
        </p>
      </div>
    );
  }

  if (!product) {
    return (
      <div>
        <h1 className="text-3xl font-bold text-slate-900">
          Product Not Found
        </h1>

        <Link
          href="/admin/products"
          className="mt-5 inline-block text-blue-600 hover:underline"
        >
          ← Back to Products
        </Link>
      </div>
    );
  }

  return (
    <div className="max-w-4xl">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-slate-900">
            Edit Product
          </h1>

          <p className="mt-2 text-slate-600">
            Update your study material.
          </p>
        </div>

        <Link
          href="/admin/products"
          className="rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
        >
          ← Back
        </Link>
      </div>

      <form
        onSubmit={handleSubmit}
        className="mt-8 space-y-6 rounded-xl border border-slate-200 bg-white p-8 shadow-sm"
      >
        {error && (
          <div className="rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-700">
            {error}
          </div>
        )}

        <div>
          <label className="block text-sm font-medium text-slate-700">
            Product Title
          </label>

          <input
            type="text"
            value={title}
            onChange={(e) =>
              setTitle(e.target.value)
            }
            className="mt-2 w-full rounded-lg border border-slate-300 px-4 py-3 outline-none focus:border-blue-500"
            required
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-slate-700">
            Slug
          </label>

          <input
            type="text"
            value={slug}
            onChange={(e) =>
              setSlug(e.target.value)
            }
            className="mt-2 w-full rounded-lg border border-slate-300 px-4 py-3 outline-none focus:border-blue-500"
            required
          />

          <p className="mt-1 text-xs text-slate-500">
            Example: engineering-mathematics-notes
          </p>
        </div>

        <div>
          <label className="block text-sm font-medium text-slate-700">
            Description
          </label>

          <textarea
            value={description}
            onChange={(e) =>
              setDescription(e.target.value)
            }
            rows={6}
            className="mt-2 w-full rounded-lg border border-slate-300 px-4 py-3 outline-none focus:border-blue-500"
            required
          />
        </div>

        <div className="grid gap-6 md:grid-cols-2">
          <div>
            <label className="block text-sm font-medium text-slate-700">
              Price (₹)
            </label>

            <input
              type="number"
              min="0"
              step="1"
              value={price}
              onChange={(e) =>
                setPrice(e.target.value)
              }
              className="mt-2 w-full rounded-lg border border-slate-300 px-4 py-3 outline-none focus:border-blue-500"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700">
              Category
            </label>

            <select
              value={categoryId}
              onChange={(e) =>
                setCategoryId(e.target.value)
              }
              className="mt-2 w-full rounded-lg border border-slate-300 bg-white px-4 py-3 outline-none focus:border-blue-500"
              required
            >
              <option value="">
                Select category
              </option>

              {categories.map((category) => (
                <option
                  key={category.id}
                  value={category.id}
                >
                  {category.name}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div className="border-t border-slate-200 pt-6">
          <label className="block text-sm font-medium text-slate-700">
            Replace Thumbnail
          </label>

          <p className="mt-1 text-xs text-slate-500">
            Leave empty to keep the existing thumbnail.
            JPG, PNG or WebP, maximum 5 MB.
          </p>

          {product.thumbnailKey && (
            <img
              src={`/api/products/${product.slug}/thumbnail`}
              alt={product.title}
              className="mt-4 h-40 w-64 rounded-lg border border-slate-200 object-cover"
            />
          )}

          {thumbnailPreview && (
            <img
              src={thumbnailPreview}
              alt="New thumbnail preview"
              className="mt-4 h-40 w-64 rounded-lg border border-blue-200 object-cover"
            />
          )}

          <input
            type="file"
            accept="image/jpeg,image/png,image/webp"
            onChange={(e) =>
              handleThumbnailChange(
                e.target.files?.[0] || null
              )
            }
            className="mt-4 block w-full text-sm text-slate-600"
          />
        </div>

        <div className="border-t border-slate-200 pt-6">
          <label className="block text-sm font-medium text-slate-700">
            Replace PDF
          </label>

          <p className="mt-1 text-xs text-slate-500">
            Leave empty to keep the existing PDF.
            Maximum 20 MB.
          </p>

          <input
            type="file"
            accept="application/pdf"
            onChange={(e) =>
              setPdfFile(
                e.target.files?.[0] || null
              )
            }
            className="mt-4 block w-full text-sm text-slate-600"
          />
        </div>

        <button
          type="submit"
          disabled={saving}
          className="w-full rounded-lg bg-blue-600 px-5 py-3 font-semibold text-white transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-60"
        >
          {saving
            ? "Saving Changes..."
            : "Save Changes"}
        </button>
      </form>
    </div>
  );
}