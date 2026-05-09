import { Skeleton } from "../ui/skeleton";
import { TableBody, TableCell, TableRow } from "../ui/table";

export const TableLoading = () => {
  const rows = Array.from({ length: 10 });

  return (
    <TableBody>
      {rows.map((_, index) => (
        <TableRow key={String(index)}>
          <TableCell>
            <Skeleton className="w-full h-5" />
          </TableCell>
          <TableCell>
            <Skeleton className="w-full h-5" />
          </TableCell>
          <TableCell>
            <Skeleton className="w-full h-5" />
          </TableCell>
          <TableCell className="flex gap-2">
            <Skeleton className="h-5 w-8" />
            <Skeleton className="h-5 w-8" />
          </TableCell>
        </TableRow>
      ))}
    </TableBody>
  );
};
