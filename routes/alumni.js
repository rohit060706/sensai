import express from 'express';
import Alumni from '../models/Alumni.js';

const router = express.Router();

// Fetch all alumni
router.get('/', async (req, res) => {
  try {
    const alumniList = await Alumni.find().sort({ year: -1 });
    res.json(alumniList);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

export default router;

import { getAlumniDetails } from '@/actions/alumni';

export async function POST(req) {
  try {
    const { year, company, searchQuery } = await req.json();
    const alumni = await getAlumniDetails({ year, company, searchQuery });

    return new Response(JSON.stringify({ alumni }), {
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (err) {
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
}
