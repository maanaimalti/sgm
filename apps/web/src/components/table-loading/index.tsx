import { Skeleton } from "../ui/skeleton";
import { TableBody, TableCell, TableRow } from "../ui/table";

type TableLoadingProps = {
  columns?: number;
  rows?: number;
};

export const TableLoading = ({
  columns = 4,
  rows = 10,
}: TableLoadingProps) => {
  const rowList = Array.from({ length: rows });
  const colList = Array.from({ length: columns });

  return (
    <TableBody>
      {rowList.map((_, rowIndex) => (
        <TableRow key={String(rowIndex)}>
          {colList.map((__, colIndex) => (
            <TableCell key={String(colIndex)}>
              <Skeleton className="w-full h-5" />
            </TableCell>
          ))}
        </TableRow>
      ))}
    </TableBody>
  );
};
