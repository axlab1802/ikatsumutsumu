import { NextResponse } from 'next/server';
import { redis } from '@/lib/redis';

export async function GET() {
    if (!redis) {
        return NextResponse.json({ score: 0, name: null }, { status: 500 });
    }
    try {
        const scoreStr = await redis.get('tsum_global_highscore');
        const nameStr = await redis.get('tsum_global_highscore_name');

        return NextResponse.json({
            score: scoreStr ? parseInt(scoreStr, 10) : 0,
            name: nameStr || null
        });
    } catch {
        return NextResponse.json({ score: 0, name: null }, { status: 500 });
    }
}

export async function POST(req: Request) {
    if (!redis) {
        return NextResponse.json({ error: 'Redis client not configured' }, { status: 500 });
    }

    try {
        const { score, name } = await req.json();

        if (typeof score !== 'number' || typeof name !== 'string') {
            return NextResponse.json({ error: 'Invalid payload' }, { status: 400 });
        }

        const currentScoreStr = await redis.get('tsum_global_highscore');
        const currentScore = currentScoreStr ? parseInt(currentScoreStr, 10) : 0;

        if (score > currentScore) {
            await redis.set('tsum_global_highscore', score.toString());
            await redis.set('tsum_global_highscore_name', name);
            return NextResponse.json({ success: true, updated: true });
        }

        return NextResponse.json({ success: true, updated: false });
    } catch {
        return NextResponse.json({ error: 'Failed to process request' }, { status: 500 });
    }
}
