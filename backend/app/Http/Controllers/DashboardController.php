<?php

namespace App\Http\Controllers;

use App\Models\Category;
use App\Models\Product;
use Illuminate\Http\JsonResponse;

class DashboardController extends Controller
{
    /**
     * GET /api/dashboard — summary statistics for the dashboard.
     */
    public function index(): JsonResponse
    {
        $totalProducts = Product::count();
        $totalStock = (int) Product::sum('stock_quantity');
        $totalValue = (float) Product::selectRaw('COALESCE(SUM(price * stock_quantity), 0) AS total')->value('total');

        $lowStockItems = Product::whereColumn('stock_quantity', '<=', 'minimum_stock')
            ->where('stock_quantity', '>', 0)
            ->count();

        $outOfStockItems = Product::where('stock_quantity', 0)->count();
        $inStockItems = max($totalProducts - $lowStockItems - $outOfStockItems, 0);

        return response()->json([
            'success' => true,
            'message' => 'Dashboard statistics retrieved successfully',
            'data' => [
                'total_products' => $totalProducts,
                'total_stock' => $totalStock,
                'in_stock_items' => $inStockItems,
                'low_stock_items' => $lowStockItems,
                'out_of_stock_items' => $outOfStockItems,
                'total_inventory_value' => round($totalValue, 2),
                'stock_status_distribution' => [
                    ['label' => 'In Stock', 'value' => $inStockItems],
                    ['label' => 'Low Stock', 'value' => $lowStockItems],
                    ['label' => 'Out of Stock', 'value' => $outOfStockItems],
                ],
                'products_by_category' => Category::query()
                    ->selectRaw('categories.name, COUNT(products.id) AS value,
                        COALESCE(SUM(products.stock_quantity), 0) AS total_units')
                    ->leftJoin('products', 'products.category_id', '=', 'categories.id')
                    ->groupBy('categories.id', 'categories.name')
                    ->orderByDesc('value')
                    ->get(),
                'recent_products' => Product::with('category')
                    ->latest()
                    ->take(5)
                    ->get(['id', 'name', 'sku', 'category_id', 'price', 'stock_quantity', 'minimum_stock'])
                    ->map(fn (Product $p) => [
                        'id' => $p->id,
                        'name' => $p->name,
                        'sku' => $p->sku,
                        'category_name' => $p->category?->name,
                        'price' => (float) $p->price,
                        'status' => $p->status,
                    ]),
                'low_stock_products' => Product::with('category')
                    ->whereColumn('stock_quantity', '<=', 'minimum_stock')
                    ->orderBy('stock_quantity')
                    ->take(5)
                    ->get(['id', 'name', 'sku', 'category_id', 'stock_quantity', 'minimum_stock'])
                    ->map(fn (Product $p) => [
                        'id' => $p->id,
                        'name' => $p->name,
                        'sku' => $p->sku,
                        'category_name' => $p->category?->name,
                        'stock_quantity' => $p->stock_quantity,
                        'minimum_stock' => $p->minimum_stock,
                        'status' => $p->status,
                    ]),
            ],
        ]);
    }
}
