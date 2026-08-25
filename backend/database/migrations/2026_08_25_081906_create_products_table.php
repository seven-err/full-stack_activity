<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        Schema::create('products', function (Blueprint $table) {
            $table->id();
            $table->string('name')->index();
            $table->string('sku')->unique();
            $table->foreignId('category_id')->constrained()->cascadeOnDelete();
            $table->decimal('price', 10, 2)->default(0);
            $table->unsignedInteger('stock_quantity')->default(0);
            $table->unsignedInteger('minimum_stock')->default(5);
            $table->string('image')->nullable();
            $table->timestamps();

            $table->index(['category_id', 'stock_quantity']);
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('products');
    }
};
