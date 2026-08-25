<?php

namespace App\Http\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class ProductResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        return [
            'id' => $this->id,
            'name' => $this->name,
            'sku' => $this->sku,
            'category_id' => $this->category_id,
            'category_name' => $this->whenLoaded('category', fn () => $this->category?->name),
            'price' => (float) $this->price,
            'stock_quantity' => (int) $this->stock_quantity,
            'minimum_stock' => (int) $this->minimum_stock,
            'image' => $this->image ? asset($this->image) : null,
            'status' => $this->status,
            'created_at' => $this->created_at?->toISOString(),
            'updated_at' => $this->updated_at?->toISOString(),
        ];
    }
}
