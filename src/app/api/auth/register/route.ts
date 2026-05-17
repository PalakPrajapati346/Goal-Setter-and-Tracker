import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { Role } from "@prisma/client";

/**
 * GET: Fetches all users with the role 'MANAGER' 
 * Used to populate the dropdown in the registration form.
 */
export async function GET() {
  try {
    const managers = await prisma.user.findMany({
      where: { role: Role.MANAGER },
      select: { 
        id: true, 
        name: true 
      },
      orderBy: { name: "asc" }
    });
    return NextResponse.json(managers);
  } catch (error) {
    console.error("Fetch managers error:", error);
    return NextResponse.json({ error: "Failed to fetch managers" }, { status: 500 });
  }
}

/**
 * POST: Handles new user registration
 */
export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { email, password, name, role, managerId } = body;

    // 1. Validation
    if (!email || !password || !name) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
    }

    // 2. Check if user already exists
    const exists = await prisma.user.findUnique({
      where: { email },
    });

    if (exists) {
      return NextResponse.json({ error: "User already exists" }, { status: 400 });
    }

    // 3. Hash the password
    const hashedPassword = await bcrypt.hash(password, 10);

    // 4. Create the user with Manager relationship
    // Only link managerId if the role is EMPLOYEE
    const user = await prisma.user.create({
      data: {
        email,
        name,
        passwordHash: hashedPassword,
        role: role || Role.EMPLOYEE,
        managerId: (role === Role.EMPLOYEE && managerId) ? managerId : null,
      },
    });

    return NextResponse.json({ 
      message: "User registered successfully", 
      userId: user.id 
    }, { status: 201 });

  } catch (error: any) {
    console.error("Registration error:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}