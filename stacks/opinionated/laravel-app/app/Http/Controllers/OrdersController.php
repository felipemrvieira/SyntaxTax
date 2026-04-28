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
    private const VALID_STATUSES = ['created', 'paid', 'shipped', 'cancelled'];
    private const ALLOWED_STATUS_TRANSITIONS = [
        'created' => ['paid', 'cancelled'],
        'paid' => ['shipped', 'cancelled'],
        'shipped' => [],
        'cancelled' => [],
    ];

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

    public function index(Request $request): JsonResponse
    {
        $query = Order::query()
            ->with(['user:id,name', 'items.product:id,name'])
            ->orderBy('id');

        if ($request->has('status')) {
            if (! in_array($request->input('status'), self::VALID_STATUSES, true)) {
                return response()->json(['detail' => "Query parameter 'status' is invalid"], 422);
            }
            $query->where('status', $request->input('status'));
        }

        if ($request->has('user_id')) {
            if (! ctype_digit((string) $request->input('user_id')) || (int) $request->input('user_id') <= 0) {
                return response()->json(['detail' => "Query parameter 'user_id' is invalid"], 422);
            }
            $query->where('user_id', (int) $request->input('user_id'));
        }

        $orders = $query->get();

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

        $nextStatus = $validator->validated()['status'];
        if (! in_array($nextStatus, self::VALID_STATUSES, true)) {
            return response()->json(['detail' => 'Field status is invalid'], 422);
        }
        if (! in_array($nextStatus, self::ALLOWED_STATUS_TRANSITIONS[$order->status] ?? [], true)) {
            return response()->json(['detail' => 'Invalid order status transition'], 409);
        }

        $order->update([
            'status' => $nextStatus,
        ]);

        return response()->json($this->serializeOrder($this->findDetailedOrder($order->id)));
    }

    private function findDetailedOrder(int $id): ?Order
    {
        return Order::query()
            ->with(['user:id,name', 'items.product:id,name'])
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
                    'product_name' => $item->product->name,
                    'quantity' => $item->quantity,
                    'unit_price' => (float) $item->unit_price,
                ])
                ->values()
                ->all(),
            'item_count' => $order->items->count(),
            'total' => (float) $order->total,
            'status' => $order->status,
            'created_at' => $order->created_at->toISOString(),
        ];
    }
}
