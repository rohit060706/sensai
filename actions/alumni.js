// actions/alumni.js
'use server';

import { auth } from '@clerk/nextjs/server';
import { db } from '@/lib/prisma';

export async function getAlumniFilterOptions() {
  const { userId } = auth();

  try {
    // Fetch unique years of passing
    const years = await db.alumni.findMany({
      distinct: ['year_of_passing'],
      select: {
        year_of_passing: true,
      },
      orderBy: {
        year_of_passing: 'desc',
      },
    });

    // fetch unique companies excluding empty / 'nan'
    const companies = await db.alumni.findMany({
      distinct: ['company'],
      where: {
        company: {
          not: null,
          not: '',
          notIn: ['nan', 'NAN', 'NaN']
        }
      },
      select: { company: true },
      orderBy: { company: 'asc' },
    });


    return {
      years: years.map(y => y.year_of_passing),
      companies: companies.map(c => c.company),
    };
  } catch (error) {
    console.error('Error fetching alumni filter options:', error.message);
    throw new Error('Failed to fetch filter options.');
  }
}

export async function getAlumniDetails({ year, company, searchQuery }) {
  const { userId } = auth();
  // Allow unauthenticated users to browse alumni data (read-only).
  // If you want to require authentication for this endpoint,
  // uncomment the following lines to enforce it:
  // if (!userId) {
  //   throw new Error('Unauthorized');
  // }

  try {
    const whereClause = {};

    if (year) {
      whereClause.year_of_passing = parseInt(year, 10);
    }
    if (company) {
      whereClause.company = company;
    } else {
      // Exclude missing companies by default
      whereClause.company = {
        not: null,
        not: '',
        notIn: ['nan', 'NAN', 'NaN']
      };
    }

    if (searchQuery) {
      // Implement search across name, email, or other relevant fields
      whereClause.OR = [
        { name: { contains: searchQuery, mode: 'insensitive' } },
        { email: { contains: searchQuery, mode: 'insensitive' } },
        // Add other fields to search if needed
      ];
    }

    const alumni = await db.alumni.findMany({
      where: whereClause,
      orderBy: {
        name: 'asc', // Order results by name
      },
      select: {
        name: true,
        email: true,
        year_of_passing: true,
        company: true,
        linkedin: true,
        // Select other fields you want to display
      },
    });

    return alumni;
  } catch (error) {
    console.error('Error fetching alumni details:', error.message);
    throw new Error('Failed to fetch alumni details.');
  }
}