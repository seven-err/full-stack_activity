<?php

namespace App\Http\Controllers;

use App\Models\Category;
use Illuminate\Http\JsonResponse;

class CategoryController extends Controller
{
    /**
     * GET /api/categories (with product counts).
     */
    public function index(): JsonResponse
    {
        $categories = Category::query()
            ->selectRaw('categories.*, COUNT(products.id) as products_count')
            ->leftJoin('products', 'products.category_id', '=', 'categories.id')
            ->groupBy('categories.id')
            ->orderBy('categories.name')
            ->get();

        return response()->json([
            'success' => true,
            'message' => 'Categories retrieved successfully',
            'data' => $categories,
        ]);
    }
}
