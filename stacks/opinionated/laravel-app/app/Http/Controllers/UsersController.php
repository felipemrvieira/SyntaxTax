<?php

namespace App\Http\Controllers;

use App\Models\User;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Validator;

class UsersController extends Controller
{
    public function store(Request $request): JsonResponse
    {
        if ($request->filled('email') && User::query()->where('email', $request->input('email'))->exists()) {
            return response()->json(['detail' => 'Email already exists'], 409);
        }

        $validator = Validator::make($request->all(), [
            'name' => ['required', 'string'],
            'email' => ['required', 'email', 'unique:users,email'],
        ]);

        if ($validator->fails()) {
            return response()->json(['detail' => $validator->errors()->first()], 422);
        }

        $validated = $validator->validated();
        $user = User::create($validated);

        return response()->json($user, 201);
    }

    public function index(): JsonResponse
    {
        return response()->json(User::query()->orderBy('id')->get());
    }

    public function show(int $id): JsonResponse
    {
        $user = User::query()->find($id);

        if (! $user) {
            return response()->json(['detail' => 'User not found'], 404);
        }

        return response()->json($user);
    }
}
