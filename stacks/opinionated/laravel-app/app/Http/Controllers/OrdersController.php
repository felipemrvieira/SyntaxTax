<?php

namespace App\Http\Controllers;

use App\Models\Order;
use App\Models\OrderItem;
use App\Models\Product;
use App\Models\User;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Validator;

class OrdersController extends Controller
{
    public function store(Request $request): JsonResponse
    {
        $validator = Validator::make($request->all(), [
            'user_id' => ['required', 'integer'],
            'items' => ['required', 'array', 'min:1'],
            'items.*.product_id' => ['required', 'integer'],
            'items.*.quantity' => ['required', 'integer', 'min:1'],
        ]);

        if ($validator->fails()) {
            return response()->json(['detail' => $validator->errors()->first()], 422);
        }

        $validated = $validator->validated();
        $user = User::query()->find($validated['user_id']);

        if (! $user) {
            return response()->json(['detail' => 'User not found'], 404);
        }

        $productIds = collect($validated['items'])->pluck('product_id')->unique()->values();
        $products = Product::query()->whereIn('id', $productIds)->get()->keyBy('id');

        if ($products->count() !== $productIds->count()) {
            return response()->json(['detail' => 'Product not found'], 404);
        }

        $order = DB::transaction(function () use ($validated, $user, $products) {
            $total = collect($validated['items'])->reduce(function ($sum, $item) use ($products) {
                $product = $products->get($item['product_id']);

                return $sum + ($product->price * $item['quantity']);
            }, 0.0);

            $order = Order::query()->create([
                'user_id' => $user->id,
                'total' => $total,
                'status' => 'created',
            ]);

            foreach ($validated['items'] as $item) {
                $product = $products->get($item['product_id']);

                $order->items()->create([
                    'product_id' => $product->id,
                    'quantity' => $item['quantity'],
                    'unit_price' => $product->price,
                ]);
            }

            return $this->findDetailedOrder($order->id);
        });

        return response()->json($this->serializeOrder($order), 201);
    }

    public function index(): JsonResponse
    {
        $orders = Order::query()
            ->with(['user:id,name', 'items.product:id'])
            ->orderBy('id')
            ->get();

        return response()->json($orders->map(fn (Order $order) => $this->serializeOrder($order)));
    }

    public function show(int $id): JsonResponse
    {
        $order = $this->findDetailedOrder($id);

        if (! $order) {
            return response()->json(['detail' => 'Order not found'], 404);
        }

        return response()->json($this->serializeOrder($order));
    }

    public function updateStatus(Request $request, int $id): JsonResponse
    {
        $validator = Validator::make($request->all(), [
            'status' => ['required', 'string'],
        ]);

        if ($validator->fails()) {
            return response()->json(['detail' => $validator->errors()->first()], 422);
        }

        $order = Order::query()->find($id);

        if (! $order) {
            return response()->json(['detail' => 'Order not found'], 404);
        }

        $order->update([
            'status' => $validator->validated()['status'],
        ]);

        return response()->json($this->serializeOrder($this->findDetailedOrder($order->id)));
    }

    private function findDetailedOrder(int $id): ?Order
    {
        return Order::query()
            ->with(['user:id,name', 'items.product:id'])
            ->find($id);
    }

    private function serializeOrder(Order $order): array
    {
        return [
            'id' => $order->id,
            'user' => [
                'id' => $order->user->id,
                'name' => $order->user->name,
            ],
            'items' => $order->items
                ->sortBy('id')
                ->map(fn (OrderItem $item) => [
                    'product_id' => $item->product_id,
                    'quantity' => $item->quantity,
                    'unit_price' => (float) $item->unit_price,
                ])
                ->values()
                ->all(),
            'total' => (float) $order->total,
            'status' => $order->status,
            'created_at' => $order->created_at->toISOString(),
        ];
    }
}
