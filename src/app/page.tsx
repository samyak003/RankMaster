'use client';

import React, {useState, useCallback} from 'react';
import {Button} from '@/components/ui/button';
import {Input} from '@/components/ui/input';
import {Table, TableBody, TableCaption, TableCell, TableHead, TableHeader, TableRow} from '@/components/ui/table';
import {File as FileIcon, User} from 'lucide-react';
import {toast} from '@/hooks/use-toast';
import {useDebouncedCallback} from '@/hooks/use-debounce';
import {cn} from '@/lib/utils';
import {Badge} from '@/components/ui/badge';
import {ArrowDownToLine} from 'lucide-react';
import {Alert, AlertDescription, AlertTitle} from '@/components/ui/alert';
import * as XLSX from 'xlsx';
import {Textarea} from '@/components/ui/textarea';

interface Student {
  name: string;
  enrollmentNumber: string;
  marks: number[];
  totalMarks: number;
  percentage: number;
  rank: number;
}

const defaultMarks = Array(5).fill('');

const Home = () => {
  const [students, setStudents] = useState<Student[]>([]);
  const [name, setName] = useState('');
  const [enrollmentNumber, setEnrollmentNumber] = useState('');
  const [marks, setMarks] = useState([...defaultMarks]);
  const [totalMarks, setTotalMarks] = useState<number | string>('');
  const [useTotalMarks, setUseTotalMarks] = useState(false);
  const [showTable, setShowTable] = useState(showTableInitialState);
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');
  const [csvData, setCsvData] = useState<string>('');
  const [inputError, setInputError] = useState<string | null>(null);

  const validateInputs = (): boolean => {
    if (!name || !enrollmentNumber) {
      setInputError('Name and Enrollment Number are required.');
      return false;
    }

    if (useTotalMarks) {
      if (!totalMarks) {
        setInputError('Total Marks are required.');
        return false;
      }
      if (isNaN(Number(totalMarks))) {
        setInputError('Total Marks must be a number.');
        return false;
      }
    } else {
      const hasEmptyMarks = marks.some(mark => !mark);
      if (hasEmptyMarks) {
        setInputError('Please fill in all the marks.');
        return false;
      }
      const areMarksInvalid = marks.some(mark => isNaN(Number(mark)));
      if (areMarksInvalid) {
        setInputError('Marks must be numbers.');
        return false;
      }
    }

    setInputError(null);
    return true;
  };

  const calculateTotal = useCallback(() => {
    if (!validateInputs()) {
      return null;
    }

    if (useTotalMarks) {
      return Number(totalMarks);
    }
    return marks.reduce((acc, mark) => acc + Number(mark), 0);
  }, [marks, totalMarks, useTotalMarks, validateInputs]);

  const addStudent = () => {
    const calculatedTotal = calculateTotal();
    if (calculatedTotal === null) {
      return;
    }

    const newStudent: Student = {
      name,
      enrollmentNumber,
      marks: marks.map(Number),
      totalMarks: calculatedTotal,
      percentage: Number(((calculatedTotal / (useTotalMarks ? 1 : marks.length * 100)) * 100).toFixed(2)),
      rank: 0,
    };

    setStudents([...students, newStudent]);
    setName('');
    setEnrollmentNumber('');
    setMarks([...defaultMarks]);
    setTotalMarks('');
    setShowTable(true);
  };

  const rankStudents = useCallback(() => {
    const sortedStudents = [...students].sort((a, b) => (sortOrder === 'desc' ? b.totalMarks - a.totalMarks : a.totalMarks - b.totalMarks));
    const rankedStudents = sortedStudents.map((student, index) => ({...student, rank: index + 1}));
    setStudents(rankedStudents);
  }, [students, sortOrder]);

  const debouncedRankStudents = useDebouncedCallback(rankStudents, 200);

  React.useEffect(() => {
    if (students.length > 0) {
      debouncedRankStudents();
    }
  }, [students, debouncedRankStudents]);

  const toggleSortOrder = () => {
    setSortOrder(prevOrder => (prevOrder === 'asc' ? 'desc' : 'asc'));
  };

  const handleMarksChange = (index: number, value: string) => {
    const newMarks = [...marks];
    newMarks[index] = value;
    setMarks(newMarks);
  };

  const exportToCSV = () => {
    if (students.length === 0) {
      toast({
        title: 'No data to export!',
        description: 'Please add student data to the table.',
      });
      return;
    }

    const headers = 'Name,Enrollment Number,Total Marks,Percentage,Rank\n';
    const csv = headers + students.map(student => `${student.name},${student.enrollmentNumber},${student.totalMarks},${student.percentage},${student.rank}`).join('\n');

    const blob = new Blob([csv], {type: 'text/csv'});
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', 'rank_list.csv');
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);

    toast({
      title: 'CSV export successful!',
      description: 'Your data has been successfully exported.',
      className: 'bg-green-500 text-white',
    });
  };

  const importFromCSV = () => {
    try {
      const workbook = XLSX.read(csvData, {type: 'string'});
      const sheetName = workbook.SheetNames[0];
      const worksheet = workbook.Sheets[sheetName];
      const jsonData = XLSX.utils.sheet_to_json(worksheet);

      if (!Array.isArray(jsonData)) {
        toast({
          title: 'Import Failed',
          description: 'Invalid CSV format. Please use a valid CSV file.',
          variant: 'destructive',
        });
        return;
      }

      const importedStudents: Student[] = jsonData.map((item: any) => {
        return {
          name: item['Name'] || '',
          enrollmentNumber: item['Enrollment Number'] || '',
          marks: [],
          totalMarks: Number(item['Total Marks'] || 0),
          percentage: Number(item['Percentage'] || 0),
          rank: Number(item['Rank'] || 0),
        };
      });

      setStudents(importedStudents);
      setShowTable(true);
      toast({
        title: 'CSV import successful!',
        description: 'Student data has been successfully imported.',
        className: 'bg-green-500 text-white',
      });
    } catch (error: any) {
      console.error('Error importing CSV:', error);
      toast({
        title: 'Import Failed',
        description: 'Failed to import CSV data. Please check the file format.',
        variant: 'destructive',
      });
    }
  };

  return (
    <div className="container mx-auto p-4">
      <h1 className="text-2xl font-bold mb-4 text-center text-primary">RankMaster</h1>

      {inputError && (
        <Alert variant="destructive">
          <AlertTitle>Error</AlertTitle>
          <AlertDescription>{inputError}</AlertDescription>
        </Alert>
      )}

      <div className="grid gap-4 mb-4">
        <Input type="text" placeholder="Name" value={name} onChange={e => setName(e.target.value)} />
        <Input type="text" placeholder="Enrollment Number" value={enrollmentNumber} onChange={e => setEnrollmentNumber(e.target.value)} />

        <div className="flex items-center space-x-2">
          <input
            type="checkbox"
            id="useTotalMarks"
            className="h-4 w-4 accent-secondary"
            checked={useTotalMarks}
            onChange={e => setUseTotalMarks(e.target.checked)}
          />
          <label htmlFor="useTotalMarks" className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70">
            Use Total Marks
          </label>
        </div>

        {useTotalMarks ? (
          <Input type="number" placeholder="Total Marks" value={totalMarks} onChange={e => setTotalMarks(e.target.value)} />
        ) : (
          <div className="grid grid-cols-5 gap-2">
            {marks.map((mark, index) => (
              <Input
                key={index}
                type="number"
                placeholder={`Subject ${index + 1} Marks`}
                value={mark}
                onChange={e => handleMarksChange(index, e.target.value)}
              />
            ))}
          </div>
        )}
        <Button onClick={addStudent} className="bg-secondary text-white hover:bg-secondary-foreground">
          Add Student
        </Button>
      </div>

      <div className="mb-4">
        <Textarea
          placeholder="Paste CSV data here"
          value={csvData}
          onChange={(e) => setCsvData(e.target.value)}
        />
        <Button onClick={importFromCSV} className="mt-2 bg-accent text-white hover:bg-accent-foreground">
          Import CSV Data
        </Button>
      </div>

      {showTable && students.length > 0 && (
        <div className="overflow-x-auto">
          <Table>
            <TableCaption>A list of students and their ranks.</TableCaption>
            <TableHeader>
              <TableRow>
                <TableHead className="w-[100px]">
                  <User className="mr-2 inline-block h-4 w-4" />
                  Name
                </TableHead>
                <TableHead>Enrollment Number</TableHead>
                <TableHead>
                  Total Marks
                  <Button variant="ghost" size="sm" onClick={toggleSortOrder}>
                    <Badge>{sortOrder === 'desc' ? 'Descending' : 'Ascending'}</Badge>
                  </Button>
                </TableHead>
                <TableHead>Percentage</TableHead>
                <TableHead>Rank</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {students.map(student => (
                <TableRow key={student.enrollmentNumber}>
                  <TableCell className="font-medium">{student.name}</TableCell>
                  <TableCell>{student.enrollmentNumber}</TableCell>
                  <TableCell>{student.totalMarks}</TableCell>
                  <TableCell>{student.percentage}</TableCell>
                  <TableCell>{student.rank}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}

      {showTable && (
        <Button onClick={exportToCSV} className="mt-4 bg-primary text-white hover:bg-primary-foreground">
          <ArrowDownToLine className="mr-2 h-4 w-4" />
          Export to CSV
        </Button>
      )}
      <Toaster />
    </div>
  );
};

export default Home;
