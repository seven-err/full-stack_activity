<?php

namespace Database\Seeders;

use App\Models\Category;
use App\Models\Product;
use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\Storage;

class ProductSeeder extends Seeder
{
    public function run(): void
    {
        $categories = Category::pluck('id', 'name');

        $products = [
            ['name' => 'Wireless Mouse MX-200', 'sku' => 'ELC-WM-200', 'category' => 'Electronics', 'price' => 29.99, 'stock_quantity' => 45, 'minimum_stock' => 10],
            ['name' => 'Bluetooth Headphones Pro', 'sku' => 'ELC-BH-450', 'category' => 'Electronics', 'price' => 89.50, 'stock_quantity' => 8, 'minimum_stock' => 12],
            ['name' => 'Smart LED Bulb 9W', 'sku' => 'ELC-LB-009', 'category' => 'Electronics', 'price' => 12.75, 'stock_quantity' => 0, 'minimum_stock' => 15],
            ['name' => 'Portable Power Bank 20000mAh', 'sku' => 'ELC-PB-20K', 'category' => 'Electronics', 'price' => 45.00, 'stock_quantity' => 32, 'minimum_stock' => 8],
            ['name' => 'A4 Copy Paper Ream (500 sheets)', 'sku' => 'OFF-CP-A4', 'category' => 'Office Supplies', 'price' => 6.49, 'stock_quantity' => 120, 'minimum_stock' => 40],
            ['name' => 'Gel Pens Pack of 12', 'sku' => 'OFF-GP-012', 'category' => 'Office Supplies', 'price' => 8.99, 'stock_quantity' => 64, 'minimum_stock' => 20],
            ['name' => 'Sticky Notes 3x3 Assorted', 'sku' => 'OFF-SN-303', 'category' => 'Office Supplies', 'price' => 3.25, 'stock_quantity' => 11, 'minimum_stock' => 25],
            ['name' => 'Heavy Duty Stapler HD-50', 'sku' => 'OFF-ST-050', 'category' => 'Office Supplies', 'price' => 18.40, 'stock_quantity' => 22, 'minimum_stock' => 6],
            ['name' => 'Mechanical Keyboard RGB K87', 'sku' => 'ACC-KB-K87', 'category' => 'Computer Accessories', 'price' => 79.99, 'stock_quantity' => 18, 'minimum_stock' => 5],
            ['name' => 'USB-C Hub 7-in-1 Adapter', 'sku' => 'ACC-HB-007', 'category' => 'Computer Accessories', 'price' => 54.95, 'stock_quantity' => 3, 'minimum_stock' => 10],
            ['name' => '27" 4K IPS Monitor U2718', 'sku' => 'ACC-MN-U27', 'category' => 'Computer Accessories', 'price' => 329.00, 'stock_quantity' => 6, 'minimum_stock' => 4],
            ['name' => 'Ergonomic Vertical Mouse V2', 'sku' => 'ACC-EV-002', 'category' => 'Computer Accessories', 'price' => 39.90, 'stock_quantity' => 27, 'minimum_stock' => 9],
            ['name' => 'Adjustable Laptop Stand AL-01', 'sku' => 'FUR-LS-001', 'category' => 'Furniture', 'price' => 34.60, 'stock_quantity' => 15, 'minimum_stock' => 5],
            ['name' => 'Office Chair ErgoFlex Deluxe', 'sku' => 'FUR-CH-EFX', 'category' => 'Furniture', 'price' => 249.00, 'stock_quantity' => 4, 'minimum_stock' => 3],
            ['name' => 'Standing Desk Converter SD-35', 'sku' => 'FUR-SD-035', 'category' => 'Furniture', 'price' => 159.99, 'stock_quantity' => 0, 'minimum_stock' => 4],
            ['name' => 'Desk Organizer Bamboo', 'sku' => 'FUR-DO-BMB', 'category' => 'Furniture', 'price' => 21.80, 'stock_quantity' => 38, 'minimum_stock' => 10],
            ['name' => 'Laptop Backpack 15.6" Water-Resistant', 'sku' => 'ACS-BP-156', 'category' => 'Accessories', 'price' => 59.99, 'stock_quantity' => 21, 'minimum_stock' => 8],
            ['name' => 'Phone Case Universal PU Leather', 'sku' => 'ACS-PC-PUL', 'category' => 'Accessories', 'price' => 14.25, 'stock_quantity' => 52, 'minimum_stock' => 15],
            ['name' => '65W GaN Fast Charger Dual Port', 'sku' => 'ACS-FC-065', 'category' => 'Accessories', 'price' => 42.00, 'stock_quantity' => 7, 'minimum_stock' => 10],
            ['name' => 'Cable Organizer Clips (Pack of 20)', 'sku' => 'ACS-CO-020', 'category' => 'Accessories', 'price' => 7.99, 'stock_quantity' => 88, 'minimum_stock' => 30],
        ];

        foreach ($products as $product) {
            $categoryId = $categories[$product['category']] ?? null;

            if (! $categoryId) {
                continue;
            }

            $imagePath = $this->createPlaceholderImage($product['name'], $product['category']);

            Product::updateOrCreate(
                ['sku' => $product['sku']],
                [
                    'name' => $product['name'],
                    'category_id' => $categoryId,
                    'price' => $product['price'],
                    'stock_quantity' => $product['stock_quantity'],
                    'minimum_stock' => $product['minimum_stock'],
                    'image' => $imagePath,
                ]
            );
        }
    }

    /**
     * Generate a simple branded SVG placeholder for each seeded product.
     */
    private function createPlaceholderImage(string $name, string $category): string
    {
        Storage::disk('public')->makeDirectory('products');

        $initials = collect(explode(' ', $name))
            ->filter(fn ($word) => ctype_alpha(substr($word, 0, 1)))
            ->take(2)
            ->map(fn ($word) => strtoupper(substr($word, 0, 1)))
            ->implode('');

        [$from, $to] = match ($category) {
            'Electronics' => ['#2563eb', '#1d4ed8'],
            'Office Supplies' => ['#0891b2', '#0e7490'],
            'Computer Accessories' => ['#7c3aed', '#6d28d9'],
            'Furniture' => ['#d97706', '#b45309'],
            default => ['#059669', '#047857'],
        };

        $svg = <<<SVG
<svg xmlns="http://www.w3.org/2000/svg" width="240" height="240" viewBox="0 0 240 240">
  <defs>
    <linearGradient id="g" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0%" stop-color="{$from}"/>
      <stop offset="100%" stop-color="{$to}"/>
    </linearGradient>
  </defs>
  <rect width="240" height="240" rx="16" fill="url(#g)"/>
  <circle cx="120" cy="120" r="72" fill="#ffffff" opacity="0.12"/>
  <text x="120" y="138" font-family="Segoe UI, Arial, sans-serif" font-size="56"
        font-weight="700" fill="#ffffff" text-anchor="middle">{$initials}</text>
</svg>
SVG;

        $filename = 'products/'.preg_replace('/[^a-z0-9]+/', '_', strtolower($name)).'.svg';

        Storage::disk('public')->put($filename, $svg);

        return 'storage/'.$filename;
    }
}
