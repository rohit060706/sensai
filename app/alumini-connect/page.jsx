// // 'use client';

// // import { useEffect, useState } from 'react';
// // import { getAlumniFilterOptions, getAlumniDetails } from '@/actions/alumni';
import React from "react";
import ClerkWrapper from "@/components/clerk/ClerkWrapper";
import AlumniConnectClient from "@/components/alumni/AlumniConnectClient";

// Server Component: wraps the client component with ClerkProvider
export default function AlumniConnectPage() {
  return (
    <ClerkWrapper>
      <AlumniConnectClient />
    </ClerkWrapper>
  );
}
// //     </div>
// //   );
// // }

// 'use client';

// import { useEffect, useState } from 'react';
// import { getAlumniFilterOptions, getAlumniDetails } from '@/actions/alumni';
// import {
//   Select,
//   SelectContent,
//   SelectItem,
//   SelectTrigger,
//   SelectValue,
// } from "@/components/ui/select";
// import { Loader2 } from "lucide-react";
// import { toast } from 'sonner';

// export default function AlumniConnectPage() {
//   const [alumni, setAlumni] = useState([]);
//   const [years, setYears] = useState([]);
//   const [loadingAlumni, setLoadingAlumni] = useState(true);

//   // Filters state
//   const [selectedYear, setSelectedYear] = useState('');

//   useEffect(() => {
//     getAlumniFilterOptions()
//       .then(options => {
//         setYears(options.years || []);
//       })
//       .catch(err => {
//         toast.error('Failed to load filter options.');
//         console.error(err);
//       });
//   }, []);

//   useEffect(() => {
//     setLoadingAlumni(true);
//     getAlumniDetails({ year: selectedYear || null })
//       .then(data => {
//         // ensure companies with empty values are filtered out client-side too (extra safety)
//         const filtered = (data || []).filter(
//           (row) => row.company && row.company.trim() !== '' && row.company.toLowerCase() !== 'nan'
//         );
//         setAlumni(filtered);
//       })
//       .catch(err => {
//         toast.error('Failed to load alumni data.');
//         console.error(err);
//       })
//       .finally(() => setLoadingAlumni(false));
//   }, [selectedYear]);

//   return (
//     <div className="p-6">
//       <h1 className="text-2xl font-bold mb-4">Alumni Connect</h1>

//       <Select
//         onValueChange={(value) => {
//           setSelectedYear(value === "all-years" ? "" : value);
//         }}
//         value={selectedYear}
//       >
//         <SelectTrigger className="border p-2 rounded w-[180px]">
//           <SelectValue placeholder="Select Year" />
//         </SelectTrigger>
//         <SelectContent>
//           <SelectItem value="all-years">All Years</SelectItem>
//           {years.map(year => (
//             <SelectItem key={year} value={String(year)}>
//               {year}
//             </SelectItem>
//           ))}
//         </SelectContent>
//       </Select>

//       <div className="mt-4 border rounded-lg">
//         <table className="w-full">
//           <thead>
//             <tr className="border-b">
//               <th className="p-2 text-left">Name</th>
//               <th className="p-2 text-left">Email</th>
//               <th className="p-2 text-left">Company</th>
//               <th className="p-2 text-left">Year</th>
//             </tr>
//           </thead>
//           <tbody>
//             {loadingAlumni ? (
//               <tr>
//                 <td colSpan={4} className="text-center p-6">
//                   <div className="flex justify-center items-center">
//                     <Loader2 className="h-6 w-6 animate-spin" />
//                     <span className="ml-2">Loading...</span>
//                   </div>
//                 </td>
//               </tr>
//             ) : alumni.length > 0 ? (
//               alumni.map((al) => (
//                 <tr key={al.email} className="border-b last:border-b-0">
//                   <td className="p-2">{al.name}</td>
//                   <td className="p-2">{al.email}</td>
//                   <td className="p-2">{al.company}</td>
//                   <td className="p-2">{al.year_of_passing}</td>
//                 </tr>
//               ))
//             ) : (
//               <tr>
//                 <td colSpan={4} className="text-center p-6 text-muted-foreground">
//                   No alumni found for the selected filter.
//                 </td>
//               </tr>
//             )}
//           </tbody>
//         </table>
//       </div>
//     </div>
//   );
// }

import { useEffect, useState } from 'react';
import { getAlumniFilterOptions, getAlumniDetails } from '@/actions/alumni';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Loader2 } from "lucide-react";
import { toast } from 'sonner';

export default function AlumniConnectPage() {
  const [alumni, setAlumni] = useState([]);
  const [years, setYears] = useState([]);
  const [loadingAlumni, setLoadingAlumni] = useState(true);

  // Filter state
  const [selectedYear, setSelectedYear] = useState(''); // '' means all
  const [selectedCompany, setSelectedCompany] = useState(''); // optional company filter

  // Load filter options (years and companies)
  useEffect(() => {
    getAlumniFilterOptions()
      .then(options => {
        setYears(options.years || []);
        // optionally you can use options.companies to populate a company dropdown
      })
      .catch(err => {
        toast.error('Failed to load filter options.');
        console.error(err);
      });
  }, []);

  // Load alumni when filters change
  useEffect(() => {
    setLoadingAlumni(true);
    // If 'all-years' selected, send null/empty to fetch all
    const yearParam = selectedYear === '' ? null : selectedYear;
    const companyParam = selectedCompany === '' ? null : selectedCompany;

    getAlumniDetails({ year: yearParam, company: companyParam, searchQuery: null })
      .then(data => {
        setAlumni(data || []);
      })
      .catch(err => {
        toast.error('Failed to load alumni data.');
        console.error(err);
      })
      .finally(() => setLoadingAlumni(false));
  }, [selectedYear, selectedCompany]);

  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold mb-4">Alumni Connect</h1>

      <div className="flex gap-4 items-center">
        <Select
          onValueChange={(value) => {
            setSelectedYear(value === "all-years" ? "" : value);
          }}
          value={selectedYear}
        >
          <SelectTrigger className="border p-2 rounded w-[180px]">
            <SelectValue placeholder="Select Year" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all-years">All Years</SelectItem>
            {years.map((y) => (
              <SelectItem key={y} value={String(y)}>{y}</SelectItem>
            ))}
          </SelectContent>
        </Select>

        {/* If you want a company select, add here */}
      </div>

      <div className="mt-4 border rounded-lg">
        <table className="w-full">
          <thead>
            <tr className="border-b">
              <th className="p-2 text-left">Name</th>
              <th className="p-2 text-left">Email</th>
              <th className="p-2 text-left">Company</th>
              <th className="p-2 text-left">Year</th>
            </tr>
          </thead>
          <tbody>
            {loadingAlumni ? (
              <tr><td colSpan={4} className="text-center p-6">
                <div className="flex justify-center items-center">
                  <Loader2 className="h-6 w-6 animate-spin" />
                  <span className="ml-2">Loading...</span>
                </div>
              </td></tr>
            ) : alumni.length > 0 ? (
              alumni.map((al) => (
                <tr key={al.email ?? al.id} className="border-b last:border-b-0">
                  <td className="p-2">{al.name}</td>
                  <td className="p-2">{al.email}</td>
                  <td className="p-2">{al.company}</td>
                  <td className="p-2">{al.year_of_passing}</td>
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan={4} className="text-center p-6 text-muted-foreground">
                  No alumni found for the selected filter.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
