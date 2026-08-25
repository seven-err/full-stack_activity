<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class Product extends Model
{
    protected $fillable = [
        'name',
        'sku',
        'category_id',
        'price',
        'stock_quantity',
        'minimum_stock',
        'image',
    ];

    protected $appends = ['status'];

    public function category(): BelongsTo
    {
        return $this->belongsTo(Category::class);
    }

    /**
     * Computed stock status: in_stock | low_stock | out_of_stock.
     */
    public function getStatusAttribute(): string
    {
        if ($this->stock_quantity <= 0) {
            return 'out_of_stock';
        }

        if ($this->stock_quantity <= $this->minimum_stock) {
            return 'low_stock';
        }

        return 'in_stock';
    }

    /**
     * Whitelisted sorting: name | price | stock_quantity | created_at (recent).
     */
    public function scopeSortBy(Builder $query, string $sortBy, string $sortDir): Builder
    {
        $column = match ($sortBy) {
            'name', 'price', 'stock_quantity' => $sortBy,
            default => 'created_at',
        };

        $direction = strtolower($sortDir) === 'asc' ? 'asc' : 'desc';

        return $query->orderBy($column, $direction);
    }

    /**
     * Search by product name or SKU.
     */
    public function scopeSearch(Builder $query, ?string $term): Builder
    {
        if (! $term) {
            return $query;
        }

        return $query->where(function (Builder $q) use ($term) {
            $q->where('name', 'like', "%{$term}%")
                ->orWhere('sku', 'like', "%{$term}%");
        });
    }

    /**
     * Filter by category id.
     */
    public function scopeCategoryFilter(Builder $query, $categoryId): Builder
    {
        if ($categoryId) {
            $query->where('category_id', $categoryId);
        }

        return $query;
    }

    /**
     * Filter by stock status: in_stock | low_stock | out_of_stock.
     */
    public function scopeStatusFilter(Builder $query, ?string $status): Builder
    {
        return match ($status) {
            'in_stock' => $query->whereColumn('stock_quantity', '>', 'minimum_stock'),
            'low_stock' => $query->whereColumn('stock_quantity', '<=', 'minimum_stock')->where('stock_quantity', '>', 0),
            'out_of_stock' => $query->where('stock_quantity', 0),
            default => $query,
        };
    }
}
