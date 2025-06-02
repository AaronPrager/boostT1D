import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { prisma } from "@/lib/prisma";
import { authOptions } from "@/lib/auth";

// POST /api/buddies/connect - Send a buddy connection request
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const { targetUserId, message } = body;

    if (!targetUserId) {
      return NextResponse.json({ error: "Target user ID is required" }, { status: 400 });
    }

    // Check if target user exists
    const targetUser = await prisma.user.findUnique({
      where: { id: targetUserId }
    });

    if (!targetUser) {
      return NextResponse.json({ error: "Target user not found" }, { status: 404 });
    }

    // Check if connection already exists
    const existingConnection = await prisma.buddyConnection.findFirst({
      where: {
        OR: [
          { requesterId: session.user.id, targetId: targetUserId },
          { requesterId: targetUserId, targetId: session.user.id }
        ]
      }
    });

    if (existingConnection) {
      return NextResponse.json({ 
        error: "Connection request already exists" 
      }, { status: 409 });
    }

    // Create new buddy connection request
    const connection = await prisma.buddyConnection.create({
      data: {
        requesterId: session.user.id,
        targetId: targetUserId,
        status: 'pending',
        message: message || null
      }
    });

    return NextResponse.json({ 
      success: true,
      connectionId: connection.id,
      message: "Buddy request sent successfully" 
    });

  } catch (error) {
    console.error("Error sending buddy request:", error);
    return NextResponse.json({ 
      error: "Failed to send buddy request" 
    }, { status: 500 });
  }
}

// GET /api/buddies/connect - Get user's buddy connections
export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const connections = await prisma.buddyConnection.findMany({
      where: {
        OR: [
          { requesterId: session.user.id },
          { targetId: session.user.id }
        ]
      },
      include: {
        requester: {
          select: { id: true, name: true, email: true }
        },
        target: {
          select: { id: true, name: true, email: true }
        }
      },
      orderBy: { createdAt: 'desc' }
    });

    return NextResponse.json({ connections });

  } catch (error) {
    console.error("Error fetching buddy connections:", error);
    return NextResponse.json({ 
      error: "Failed to fetch buddy connections" 
    }, { status: 500 });
  }
}

// PUT /api/buddies/connect - Update buddy connection status (approve/reject)
export async function PUT(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const { connectionId, status } = body;

    if (!connectionId || !status) {
      return NextResponse.json({ 
        error: "Connection ID and status are required" 
      }, { status: 400 });
    }

    if (!['approved', 'rejected'].includes(status)) {
      return NextResponse.json({ 
        error: "Status must be 'approved' or 'rejected'" 
      }, { status: 400 });
    }

    const connection = await prisma.buddyConnection.findUnique({
      where: { id: connectionId }
    });

    if (!connection) {
      return NextResponse.json({ error: "Connection not found" }, { status: 404 });
    }

    // Only the target user can approve/reject the request
    if (connection.targetId !== session.user.id) {
      return NextResponse.json({ 
        error: "Only the target user can approve or reject this request" 
      }, { status: 403 });
    }

    const updatedConnection = await prisma.buddyConnection.update({
      where: { id: connectionId },
      data: { status }
    });

    return NextResponse.json({ 
      success: true,
      connection: updatedConnection,
      message: `Buddy request ${status} successfully` 
    });

  } catch (error) {
    console.error("Error updating buddy connection:", error);
    return NextResponse.json({ 
      error: "Failed to update buddy connection" 
    }, { status: 500 });
  }
} 