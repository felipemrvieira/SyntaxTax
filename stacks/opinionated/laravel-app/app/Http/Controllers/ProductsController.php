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

    public function index(Request $request): JsonResponse
    {
        $query = Product::query()->orderBy('id');

        if ($request->has('min_price')) {
            if (! is_numeric($request->input('min_price')) || (float) $request->input('min_price') <= 0) {
                return response()->json(['detail' => "Query parameter 'min_price' is invalid"], 422);
            }
            $query->where('price', '>=', (float) $request->input('min_price'));
        }

        if ($request->has('max_price')) {
            if (! is_numeric($request->input('max_price')) || (float) $request->input('max_price') <= 0) {
                return response()->json(['detail' => "Query parameter 'max_price' is invalid"], 422);
            }
            $query->where('price', '<=', (float) $request->input('max_price'));
        }

        return response()->json($query->get());
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
