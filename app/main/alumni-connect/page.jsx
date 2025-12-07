// app/main/alumni-connect/page.jsx
'use client';

import { useState, useEffect } from 'react';
import { SignedIn, SignedOut, SignInButton } from "@clerk/nextjs";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Loader2 } from "lucide-react";
import { getAlumniFilterOptions, getAlumniDetails } from "@/actions/alumni"; // Your new server actions
import { toast } from 'sonner';

export default function AlumniConnectPage() {
  const [years, setYears] = useState([]);
  const [companies, setCompanies] = useState([]);
  const [selectedYear, setSelectedYear] = useState('');
  const [selectedCompany, setSelectedCompany] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [alumni, setAlumni] = useState([]);
  const [loadingFilters, setLoadingFilters] = useState(true);
  const [loadingAlumni, setLoadingAlumni] = useState(false);
  const [error, setError] = useState(null);

  // Fetch filter options on component mount
  useEffect(() => {
    const fetchFilterOptions = async () => {
      try {
        setLoadingFilters(true);
        const { years: fetchedYears, companies: fetchedCompanies } = await getAlumniFilterOptions();
        setYears(fetchedYears);
        setCompanies(fetchedCompanies);
      } catch (err) {
        setError(err.message);
        toast.error(err.message);
      } finally {
        setLoadingFilters(false);
      }
    };
    fetchFilterOptions();
  }, []);

  // Fetch alumni details whenever filters or search query change
  useEffect(() => {
    const fetchAlumni = async () => {
      try {
        setLoadingAlumni(true);
        setError(null);
        const fetchedAlumni = await getAlumniDetails({
          year: selectedYear,
          company: selectedCompany,
          searchQuery: searchQuery,
        });
        setAlumni(fetchedAlumni);
      } catch (err) {
        setError(err.message);
        toast.error(err.message);
      } finally {
        setLoadingAlumni(false);
      }
    };

    // Only fetch if filters are loaded
    if (!loadingFilters) {
      fetchAlumni();
    }
  }, [selectedYear, selectedCompany, searchQuery, loadingFilters]);

  return (
    <>
      <SignedIn>
        <div className="container mx-auto py-6 space-y-6">
          <h1 className="text-5xl font-bold gradient-title text-center mt-20  mb-8">Alumni Connect</h1>

          <Card>
            <CardHeader>
              <CardTitle>Filter and Search Alumni</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <Select
                  onValueChange={(value) =>
                    setSelectedYear(value === "all-years" ? "" : value)
                  }
                  value={selectedYear}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select Year of Passing" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all-years">All Years</SelectItem>
                    {years?.map((year) => (
                      <SelectItem key={year} value={String(year)}>
                        {year}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>

                <Select
                  onValueChange={(value) =>
                    setSelectedCompany(value === "all-companies" ? "" : value)
                  }
                  value={selectedCompany}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select Company" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all-companies">All Companies</SelectItem>
                    {companies?.map((company) => (
                      <SelectItem key={company} value={company}>
                        {company}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>


                <Input
                  placeholder="Search by Name, Email"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                />
              </div>
              {loadingFilters && <p className="text-center text-muted-foreground">Loading filter options...</p>}
              {error && <p className="text-center text-red-500">{error}</p>}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Alumni Details</CardTitle>
            </CardHeader>
            <CardContent>
              {loadingAlumni ? (
                <div className="flex justify-center items-center h-40">
                  <Loader2 className="h-8 w-8 animate-spin text-primary" />
                  <p className="ml-2 text-muted-foreground">Fetching alumni...</p>
                </div>
              ) : alumni.length === 0 ? (
                <p className="text-center text-muted-foreground">No alumni found for the selected criteria.</p>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Name</TableHead>
                      <TableHead>Email</TableHead>
                      <TableHead>Year of Passing</TableHead>
                      <TableHead>Company</TableHead>
                      <TableHead>LinkedIn</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {alumni.map((alumnus) => (
                      <TableRow key={alumnus.email}>
                        <TableCell className="font-medium">{alumnus.name}</TableCell>
                        <TableCell>{alumnus.email}</TableCell>
                        <TableCell>{alumnus.year_of_passing}</TableCell>
                        <TableCell>{alumnus.company}</TableCell>
                        <TableCell>
                          {alumnus.linkedin ? (
                            <a
                              href={alumnus.linkedin}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-blue-600 hover:underline"
                            >
                              Profile
                            </a>
                          ) : (
                            'N/A'
                          )}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </div>
      </SignedIn>

      <SignedOut>
        <div className="flex flex-col items-center justify-center min-h-[70vh] space-y-4">
          <h2 className="text-3xl font-semibold">
            Please sign in to access Alumni Connect
          </h2>
          <SignInButton>
            <Button variant="outline">Sign In</Button>
          </SignInButton>
        </div>
      </SignedOut>
    </>
  );

}