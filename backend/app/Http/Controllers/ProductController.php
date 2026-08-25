<?php

namespace App\Http\Controllers;

use App\Http\Resources\ProductResource;
use App\Models\Category;
use App\Models\Product;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Storage;

class ProductController extends Controller
{
    /**
     * GET /api/products
     * Supports: ?search=&category_id=&status=&sort_by=&sort_dir=&per_page=
     */
    public function index(Request $request): JsonResponse
    {
        $products = Product::with('category')
            ->search($request->query('search'))
            ->categoryFilter($request->query('category_id'))
            ->statusFilter($request->query('status'))
            ->sortBy(
                $request->query('sort_by', 'created_at'),
                $request->query('sort_dir', 'desc')
            )
            ->paginate(min((int) $request->query('per_page', 10), 100))
            ->withQueryString();

        return response()->json([
            'success' => true,
            'message' => 'Products retrieved successfully',
            'data' => ProductResource::collection($items = $products->items()),
            'meta' => [
                'current_page' => $products->currentPage(),
                'last_page' => $products->lastPage(),
                'per_page' => $products->perPage(),
                'total' => $products->total(),
            ],
        ]);
    }

    /**
     * POST /api/products
     */
    public function store(Request $request): JsonResponse
    {
        $validated = $this->validateProduct($request);

        // Auto-generate a unique SKU when the user leaves it blank
        if (empty($validated['sku'])) {
            $validated['sku'] = $this->generateSku($validated['category_id']);
        }

        if ($request->hasFile('image')) {
            $validated['image'] = $this->storeImage($request);
        }

        $product = Product::create($validated);

        return response()->json([
            'success' => true,
            'message' => 'Product created successfully',
            'data' => new ProductResource($product->load('category')),
        ], 201);
    }

    /**
     * GET /api/products/{id}
     */
    public function show(int $id): JsonResponse
    {
        $product = Product::with('category')->find($id);

        if (! $product) {
            return $this->notFound();
        }

        return response()->json([
            'success' => true,
            'message' => 'Product retrieved successfully',
            'data' => new ProductResource($product),
        ]);
    }

    /**
     * PUT/PATCH /api/products/{id}
     */
    public function update(Request $request, int $id): JsonResponse
    {
        $product = Product::find($id);

        if (! $product) {
            return $this->notFound();
        }

        $validated = $this->validateProduct($request, $product->id);

        if ($request->hasFile('image')) {
            $this->deleteImage($product->image);
            $validated['image'] = $this->storeImage($request);
        }

        $product->update($validated);

        return response()->json([
            'success' => true,
            'message' => 'Product updated successfully',
            'data' => new ProductResource($product->fresh('category')),
        ]);
    }

    /**
     * DELETE /api/products/{id}
     */
    public function destroy(int $id): JsonResponse
    {
        $product = Product::find($id);

        if (! $product) {
            return $this->notFound();
        }

        DB::transaction(function () use ($product) {
            $this->deleteImage($product->image);
            $product->delete();
        });

        return response()->json([
            'success' => true,
            'message' => 'Product deleted successfully',
            'data' => null,
        ]);
    }

    private function validateProduct(Request $request, ?int $ignoreId = null): array
    {
        $uniqueSku = 'unique:products,sku';

        if ($ignoreId) {
            $uniqueSku .= ','.$ignoreId;
        }

        return $request->validate([
            'name' => ['required', 'string', 'min:2', 'max:150'],
            'sku' => ['nullable', 'string', 'max:50', $uniqueSku],
            'category_id' => ['required', 'integer', 'exists:categories,id'],
            'price' => ['required', 'numeric', 'min:0', 'max:99999999.99'],
            'stock_quantity' => ['required', 'integer', 'min:0'],
            'minimum_stock' => ['required', 'integer', 'min:0'],
            'image' => ['nullable', 'image', 'mimes:jpg,jpeg,png,gif,webp', 'max:2048'],
            '_method' => ['sometimes', 'string'],
        ]);
    }

    /**
     * Generate a unique SKU from the category prefix, e.g. ELC-0021.
     */
    private function generateSku(int $categoryId): string
    {
        $prefixes = [
            'Electronics' => 'ELC',
            'Office Supplies' => 'OFF',
            'Computer Accessories' => 'CMP',
            'Furniture' => 'FUR',
            'Accessories' => 'ACS',
        ];

        $category = Category::findOrFail($categoryId);
        $prefix = $prefixes[$category->name]
            ?? strtoupper(substr(preg_replace('/[^a-z]/i', '', $category->name) ?: 'PRD', 0, 3));

        $next = (int) Product::max('id') + 1;

        do {
            $candidate = sprintf('%s-%04d', $prefix, $next++);
        } while (Product::where('sku', $candidate)->exists());

        return $candidate;
    }

    private function storeImage(Request $request): string
    {
        $path = $request->file('image')->store('products', 'public');

        return 'storage/'.$path;
    }

    private function deleteImage(?string $image): void
    {
        if ($image && str_starts_with($image, 'storage/')) {
            Storage::disk('public')->delete(substr($image, strlen('storage/')));
        }
    }

    private function notFound(): JsonResponse
    {
        return response()->json([
            'success' => false,
            'message' => 'Product not found',
            'data' => null,
        ], 404);
    }
}
