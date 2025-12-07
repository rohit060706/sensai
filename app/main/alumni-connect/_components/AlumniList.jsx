// File: app/main/alumni-connect/_components/AlumniList.jsx
'use client';

import { useState, useMemo } from 'react';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';

export default function AlumniList({ alumni }) {
  const [searchTerm, setSearchTerm] = useState('');

  const filteredAlumni = useMemo(() => {
    if (!searchTerm) return alumni;
    return alumni.filter(
      (person) =>
        person.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        person.company.toLowerCase().includes(searchTerm.toLowerCase())
    );
  }, [searchTerm, alumni]);

  return (
    <div className="space-y-4">
      <Input
        placeholder="Search by name or company..."
        value={searchTerm}
        onChange={(e) => setSearchTerm(e.target.value)}
        className="max-w-sm"
      />
      <div className="border rounded-lg">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="font-semibold">Name</TableHead>
              <TableHead className="font-semibold">Company</TableHead>
              <TableHead className="font-semibold">Position</TableHead>
              <TableHead className="font-semibold text-center">Grad. Year</TableHead>
              <TableHead className="font-semibold text-right">Profile</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredAlumni.map((person) => (
              <TableRow key={person.id}>
                <TableCell>{person.name}</TableCell>
                <TableCell>{person.company}</TableCell>
                <TableCell>{person.position}</TableCell>
                <TableCell className="text-center">
                  <Badge variant="secondary">{person.graduationYear}</Badge>
                </TableCell>
                <TableCell className="text-right">
                  {person.linkedinUrl && (
                    <a
                      href={person.linkedinUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-blue-500 hover:underline"
                    >
                      LinkedIn
                    </a>
                  )}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}