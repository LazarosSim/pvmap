
import React, { useState } from 'react';
import { useParams, Navigate } from 'react-router-dom';
import { useDB } from '@/lib/db-provider';
import Layout from '@/components/layout/layout';
import { Button } from '@/components/ui/button';
import { Plus, RotateCcw, Edit, Check, X, ArrowDown, Loader2 } from 'lucide-react';
import AddBarcodeDialog from '@/components/dialog/add-barcode-dialog';
import { Input } from '@/components/ui/input';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { toast } from "sonner";
import { Label } from '@/components/ui/label';

const RowDetail = () => {
  const { rowId } = useParams<{ rowId: string }>();
  const { rows, getRowById, getBarcodesByRowId, getParkById, resetRow, updateRow, updateBarcode, addBarcode } = useDB();
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isInsertDialogOpen, setIsInsertDialogOpen] = useState(false);
  const [insertAfterIndex, setInsertAfterIndex] = useState<number | null>(null);
  const [insertCode, setInsertCode] = useState('');
  const [isResetDialogOpen, setIsResetDialogOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [editingBarcode, setEditingBarcode] = useState<{id: string, code: string} | null>(null);
  const [editingRowName, setEditingRowName] = useState(false);
  const [rowName, setRowName] = useState('');
  const [isInserting, setIsInserting] = useState(false);
  const [isResetting, setIsResetting] = useState(false);

  if (!rowId || !rows.some(r => r.id === rowId)) {
    return <Navigate to="/" replace />;
  }

  const row = getRowById(rowId);
  const barcodes = getBarcodesByRowId(rowId);
  const park = row ? getParkById(row.parkId) : undefined;
  
  const filteredBarcodes = barcodes.filter(barcode => 
    barcode.code.toLowerCase().includes(searchQuery.toLowerCase())
  );
  
  const breadcrumb = park ? `${park.name} / ${row?.name}` : row?.name;

  const handleReset = async () => {
    setIsResetting(true);
    try {
      await resetRow(rowId);
      setIsResetDialogOpen(false);
    } finally {
      setIsResetting(false);
    }
  };
  
  const handleEditBarcode = (id: string, code: string) => {
    setEditingBarcode({id, code});
  };
  
  const saveEditedBarcode = async () => {
    if (editingBarcode) {
      const result = await updateBarcode(editingBarcode.id, editingBarcode.code);
      if (result !== undefined && result !== null) {
        toast.success("Barcode updated successfully");
      }
      setEditingBarcode(null);
    }
  };
  
  const cancelEditBarcode = () => {
    setEditingBarcode(null);
  };
  
  const startRowRename = () => {
    if (row) {
      setRowName(row.name);
      setEditingRowName(true);
    }
  };
  
  const saveRowName = async () => {
    if (row && rowName.trim()) {
      const result = await updateRow(row.id, rowName.trim());
      if (result !== undefined && result !== null) {
        toast.success("Row name updated successfully");
      }
      setEditingRowName(false);
    } else {
      toast.error("Row name cannot be empty");
    }
  };
  
  const handleInsertBarcode = async () => {
    if (insertCode.trim() && insertAfterIndex !== null) {
      setIsInserting(true);
      try {
        // Now our addBarcode accepts the insertAfterIndex parameter
        const result = await addBarcode(insertCode.trim(), rowId, insertAfterIndex);
        
        if (result !== undefined && result !== null) {
          toast.success("Barcode inserted successfully");
          setInsertCode('');
          setIsInsertDialogOpen(false);
        }
      } catch (error) {
        console.error("Error inserting barcode:", error);
        toast.error("Failed to insert barcode");
      } finally {
        setIsInserting(false);
      }
    }
  };

  const titleContent = editingRowName ? (
    <div className="flex items-center space-x-2">
      <Input
        value={rowName}
        onChange={(e) => setRowName(e.target.value)}
        className="w-40"
        autoFocus
      />
      <Button variant="ghost" size="icon" onClick={saveRowName} className="h-8 w-8">
        <Check className="h-4 w-4 text-green-500" />
      </Button>
      <Button variant="ghost" size="icon" onClick={() => setEditingRowName(false)} className="h-8 w-8">
        <X className="h-4 w-4 text-red-500" />
      </Button>
    </div>
  ) : (
    <div className="flex items-center space-x-2">
      <span>{breadcrumb || 'Row Detail'}</span>
      <Button variant="ghost" size="icon" onClick={startRowRename} className="h-6 w-6">
        <Edit className="h-3 w-3 text-muted-foreground" />
      </Button>
    </div>
  );

  return (
    <Layout title={breadcrumb || 'Row Detail'} showBack titleAction={titleContent}>
      <div className="flex flex-col">
        <div className="flex items-center justify-between mb-6">
          <Input
            placeholder="Search barcodes..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="flex-1 mr-2 bg-white/80 backdrop-blur-sm border border-inventory-secondary/30"
          />
          <Button 
            variant="outline"
            onClick={() => setIsResetDialogOpen(true)}
            disabled={isResetting}
            className="gap-2 text-inventory-secondary border-inventory-secondary/30 hover:bg-inventory-secondary/10"
          >
            {isResetting ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <RotateCcw className="h-4 w-4" />
            )}
            Reset Row
          </Button>
        </div>

        {filteredBarcodes.length > 0 ? (
          <div className="rounded-md border glass-card overflow-hidden">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-20">No.</TableHead>
                  <TableHead>Barcode</TableHead>
                  <TableHead className="w-40">Timestamp</TableHead>
                  <TableHead className="w-28">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredBarcodes.map((barcode, index) => (
                  <React.Fragment key={barcode.id}>
                    <TableRow>
                      <TableCell className="font-medium">{index + 1}</TableCell>
                      <TableCell>
                        {editingBarcode && editingBarcode.id === barcode.id ? (
                          <div className="flex items-center space-x-2">
                            <Input 
                              value={editingBarcode.code}
                              onChange={(e) => setEditingBarcode({...editingBarcode, code: e.target.value})}
                              className="w-full"
                              autoFocus
                            />
                            <Button variant="ghost" size="icon" onClick={saveEditedBarcode} className="text-inventory-secondary">
                              <Check className="h-4 w-4" />
                            </Button>
                            <Button variant="ghost" size="icon" onClick={cancelEditBarcode} className="text-red-500">
                              <X className="h-4 w-4" />
                            </Button>
                          </div>
                        ) : (
                          barcode.code
                        )}
                      </TableCell>
                      <TableCell className="text-muted-foreground">
                        {new Date(barcode.timestamp).toLocaleString()}
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center space-x-1">
                          <Button 
                            variant="ghost" 
                            size="icon" 
                            onClick={() => handleEditBarcode(barcode.id, barcode.code)}
                            className="h-8 w-8 text-inventory-secondary"
                          >
                            <Edit className="h-4 w-4" />
                          </Button>
                          <Button 
                            variant="ghost" 
                            size="icon" 
                            onClick={() => {
                              setInsertAfterIndex(index);
                              setIsInsertDialogOpen(true);
                            }}
                            className="h-8 w-8 text-inventory-primary"
                          >
                            <ArrowDown className="h-4 w-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  </React.Fragment>
                ))}
              </TableBody>
            </Table>
          </div>
        ) : (
          <div className="text-center py-8">
            <p className="text-muted-foreground mb-4">
              {searchQuery ? "No barcodes found matching your search" : "No barcodes found. Add your first barcode to get started."}
            </p>
          </div>
        )}
        
        <Button 
          onClick={() => setIsDialogOpen(true)}
          className="fixed bottom-20 right-4 rounded-full w-14 h-14 shadow-lg bg-inventory-primary hover:bg-inventory-primary/90"
        >
          <Plus className="h-6 w-6" />
        </Button>
        
        <AddBarcodeDialog 
          open={isDialogOpen} 
          onOpenChange={setIsDialogOpen} 
          rowId={rowId}
        />

        <AlertDialog open={isResetDialogOpen} onOpenChange={setIsResetDialogOpen}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Are you sure?</AlertDialogTitle>
              <AlertDialogDescription>
                This will delete all barcodes in this row. This action cannot be undone.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancel</AlertDialogCancel>
              <AlertDialogAction 
                onClick={handleReset} 
                disabled={isResetting}
                className="bg-destructive text-destructive-foreground"
              >
                {isResetting ? (
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                ) : null}
                Reset Row
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
        
        <Dialog open={isInsertDialogOpen} onOpenChange={setIsInsertDialogOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Insert Barcode</DialogTitle>
            </DialogHeader>
            <div className="py-4">
              <div className="space-y-2">
                <Label htmlFor="insertCode">Barcode</Label>
                <Input
                  id="insertCode"
                  value={insertCode}
                  onChange={(e) => setInsertCode(e.target.value)}
                  placeholder="Enter barcode"
                  className="w-full"
                  autoFocus
                />
              </div>
              {insertAfterIndex !== null && (
                <p className="text-sm text-muted-foreground mt-2">
                  This barcode will be inserted after item #{insertAfterIndex + 1}
                </p>
              )}
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setIsInsertDialogOpen(false)}>
                Cancel
              </Button>
              <Button 
                onClick={handleInsertBarcode} 
                disabled={!insertCode.trim() || isInserting}
                className="bg-inventory-primary hover:bg-inventory-primary/90"
              >
                {isInserting ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Inserting...
                  </>
                ) : (
                  'Insert Barcode'
                )}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </Layout>
  );
};

export default RowDetail;
