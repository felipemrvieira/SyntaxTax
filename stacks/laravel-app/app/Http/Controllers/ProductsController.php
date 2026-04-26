<?php

namespace App\Http\Controllers;

use App\Models\Product;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Validator;

class ProductsController extends Controller
{
    public function store(Request $request): JsonResponse
    {
        $validator = Validator::make($request->all(), [
            'name' => ['required', 'string'],
            'price' => ['required', 'numeric', 'gt:0'],
        ]);

        if ($validator->fails()) {
            return response()->json(['detail' => $validator->errors()->first()], 422);
        }

        $validated = $validator->validated();
        $product = Product::create($validated);

        return response()->json($product, 201);
    }

    public function index(): JsonResponse
    {
        return response()->json(Product::query()->orderBy('id')->get());
    }

    public function show(int $id): JsonResponse
    {
        $product = Product::query()->find($id);

        if (! $product) {
            return response()->json(['detail' => 'Product not found'], 404);
        }

        return response()->json($product);
    }
}
