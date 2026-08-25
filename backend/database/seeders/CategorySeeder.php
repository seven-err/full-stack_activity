<?php

namespace Database\Seeders;

use App\Models\Category;
use Illuminate\Database\Seeder;

class CategorySeeder extends Seeder
{
    public function run(): void
    {
        $categories = [
            ['name' => 'Electronics', 'description' => 'Consumer electronics, gadgets and smart devices'],
            ['name' => 'Office Supplies', 'description' => 'Everyday stationery and office essentials'],
            ['name' => 'Computer Accessories', 'description' => 'Peripherals, cables and add-ons for computers'],
            ['name' => 'Furniture', 'description' => 'Office and home furniture pieces'],
            ['name' => 'Accessories', 'description' => 'Bags, cases, chargers and everyday carry'],
        ];

        foreach ($categories as $category) {
            Category::updateOrCreate(['name' => $category['name']], $category);
        }
    }
}
