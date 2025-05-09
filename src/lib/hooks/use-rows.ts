import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import type { Row, Barcode } from '../types/db-types';

export const useRows = (barcodes: Barcode[], setBarcodes: React.Dispatch<React.SetStateAction<Barcode[]>>) => {
  const [rows, setRows] = useState<Row[]>([]);

  // Fetch rows data
  const fetchRows = async (userId?: string) => {
    if (!userId) return;
    
    try {
      const { data, error } = await supabase
        .from('rows')
        .select('*')
        .order('created_at', { ascending: false });
        
      if (error) {
        console.error('Error fetching rows:', error);
        toast.error(`Failed to load rows: ${error.message}`);
        return;
      }
      
      if (data) {
        const formattedRows: Row[] = data.map(row => ({
          id: row.id,
          name: row.name,
          parkId: row.park_id,
          createdAt: row.created_at,
          expectedBarcodes: row.expected_barcodes
        }));
        
        setRows(formattedRows);
      }
    } catch (error: any) {
      console.error('Error in fetchRows:', error.message);
    }
  };
  
  const getRowsByParkId = (parkId: string): Row[] => {
    return rows.filter(row => row.parkId === parkId);
  };
  
  const addRow = async (parkId: string, expectedBarcodes?: number, navigate: boolean = true): Promise<Row | null> => {
    // Get rows count for this park to create a sequential name
    const parkRows = rows.filter(row => row.parkId === parkId);
    const rowNumber = parkRows.length + 1;
    const rowName = `Row ${rowNumber}`;
    
    try {
      const { data, error } = await supabase
        .from('rows')
        .insert([{ 
          name: rowName,
          park_id: parkId,
          expected_barcodes: expectedBarcodes
        }])
        .select();
        
      if (error) {
        console.error('Error adding row:', error);
        toast.error(`Failed to create row: ${error.message}`);
        return null;
      }
      
      if (data && data[0]) {
        const newRow: Row = {
          id: data[0].id,
          name: data[0].name,
          parkId: data[0].park_id,
          createdAt: data[0].created_at,
          expectedBarcodes: data[0].expected_barcodes
        };
        
        setRows(prev => [newRow, ...prev]);
        toast.success('Row added successfully');
        return newRow;
      }
      
      return null;
    } catch (error: any) {
      console.error('Error in addRow:', error.message);
      toast.error(`Failed to create row: ${error.message}`);
      return null;
    }
  };

  const addSubRow = async (parentRowId: string, expectedBarcodes?: number): Promise<Row | null> => {
    // Get the original row
    const originalRow = rows.find(row => row.id === parentRowId);
    if (!originalRow) {
      toast.error('Parent row not found');
      return null;
    }
    
    // Extract the base row name (get the row number)
    const baseNameMatch = originalRow.name.match(/^Row\s+(\d+)(?:_[a-z])?$/i);
    if (!baseNameMatch) {
      toast.error('Unable to determine parent row base name');
      return null;
    }
    
    const rowNumber = baseNameMatch[1];
    const parkId = originalRow.parkId;
    
    // Find all related rows with the same base number
    const relatedRows = rows.filter(row => {
      const match = row.name.match(/^Row\s+(\d+)(?:_([a-z]))?$/i);
      return match && match[1] === rowNumber && row.parkId === parkId;
    });
    
    // Check if we need to rename the original row (if it doesn't have a suffix yet)
    const needsRenaming = originalRow.name === `Row ${rowNumber}`;
    
    // First, if the original row needs renaming, do that before adding a new one
    if (needsRenaming) {
      // Always rename to _a first
      await updateRow(originalRow.id, `Row ${rowNumber}_a`);
      
      // After renaming, the new row will be _b
      const newRowName = `Row ${rowNumber}_b`;
      
      try {
        const { data, error } = await supabase
          .from('rows')
          .insert([{ 
            name: newRowName,
            park_id: parkId,
            expected_barcodes: expectedBarcodes
          }])
          .select();
          
        if (error) {
          console.error('Error adding subrow:', error);
          toast.error(`Failed to create subrow: ${error.message}`);
          return null;
        }
        
        if (data && data[0]) {
          const newRow: Row = {
            id: data[0].id,
            name: data[0].name,
            parkId: data[0].park_id,
            createdAt: data[0].created_at,
            expectedBarcodes: data[0].expected_barcodes
          };
          
          setRows(prev => [newRow, ...prev]);
          toast.success('Subrow added successfully');
          return newRow;
        }
        
        return null;
      } catch (error: any) {
        console.error('Error in addSubRow:', error.message);
        toast.error(`Failed to create subrow: ${error.message}`);
        return null;
      }
    } else {
      // The original row already has a suffix, so just determine the next letter
      const suffixes = relatedRows
        .map(row => {
          const match = row.name.match(/^Row\s+\d+_([a-z])$/i);
          return match ? match[1].toLowerCase() : '';
        })
        .filter(Boolean);
      
      // Get the last letter and increment it
      const lastLetter = String.fromCharCode(
        Math.max(...suffixes.map(s => s.charCodeAt(0)))
      );
      const nextSuffix = String.fromCharCode(lastLetter.charCodeAt(0) + 1);
      
      // Create new row with the next suffix
      const newRowName = `Row ${rowNumber}_${nextSuffix}`;
      
      try {
        const { data, error } = await supabase
          .from('rows')
          .insert([{ 
            name: newRowName,
            park_id: parkId,
            expected_barcodes: expectedBarcodes
          }])
          .select();
          
        if (error) {
          console.error('Error adding subrow:', error);
          toast.error(`Failed to create subrow: ${error.message}`);
          return null;
        }
        
        if (data && data[0]) {
          const newRow: Row = {
            id: data[0].id,
            name: data[0].name,
            parkId: data[0].park_id,
            createdAt: data[0].created_at,
            expectedBarcodes: data[0].expected_barcodes
          };
          
          setRows(prev => [newRow, ...prev]);
          toast.success('Subrow added successfully');
          return newRow;
        }
        
        return null;
      } catch (error: any) {
        console.error('Error in addSubRow:', error.message);
        toast.error(`Failed to create subrow: ${error.message}`);
        return null;
      }
    }
  };
  
  const updateRow = async (rowId: string, name: string, expectedBarcodes?: number) => {
    try {
      const updateData: { name?: string; expected_barcodes?: number | null } = {};
      
      if (name !== undefined) {
        updateData.name = name;
      }
      
      if (expectedBarcodes !== undefined) {
        updateData.expected_barcodes = expectedBarcodes;
      }
      
      const { error } = await supabase
        .from('rows')
        .update(updateData)
        .eq('id', rowId);
        
      if (error) {
        console.error('Error updating row:', error);
        toast.error(`Failed to update row: ${error.message}`);
        return;
      }
      
      setRows(prev => prev.map(row => 
        row.id === rowId 
          ? { ...row, name: name !== undefined ? name : row.name, expectedBarcodes: expectedBarcodes !== undefined ? expectedBarcodes : row.expectedBarcodes } 
          : row
      ));
      
      toast.success('Row updated successfully');
    } catch (error: any) {
      console.error('Error in updateRow:', error.message);
      toast.error(`Failed to update row: ${error.message}`);
    }
  };
  
  const resetRow = async (rowId: string) => {
    try {
      // First check if we have any barcodes for this row directly from the database
      // This ensures we get the most up-to-date information rather than relying on local state
      const { data: rowBarcodesData, error: fetchError } = await supabase
        .from('barcodes')
        .select('*')
        .eq('row_id', rowId);
        
      if (fetchError) {
        console.error('Error fetching row barcodes:', fetchError);
        toast.error(`Failed to check row barcodes: ${fetchError.message}`);
        return;
      }
      
      // Now use the data directly from the database to check if there are barcodes
      if (!rowBarcodesData || rowBarcodesData.length === 0) {
        toast.info('No barcodes to reset');
        return;
      }
      
      // Format the barcodes from the database to match our local state format
      const rowBarcodes = rowBarcodesData.map(barcode => ({
        id: barcode.id,
        code: barcode.code,
        rowId: barcode.row_id,
        userId: barcode.user_id,
        timestamp: barcode.timestamp,
        displayOrder: barcode.display_order || 0
      }));
      
      // Group barcodes by user and date for adjustment
      const userBarcodeCounts: {[key: string]: number} = {};
      
      // Format: userId_date -> count
      rowBarcodes.forEach(barcode => {
        const scanDate = new Date(barcode.timestamp).toISOString().split('T')[0];
        const key = `${barcode.userId}_${scanDate}`;
        
        if (!userBarcodeCounts[key]) {
          userBarcodeCounts[key] = 0;
        }
        userBarcodeCounts[key]++;
      });
      
      // Delete all barcodes for this row
      const { error } = await supabase
        .from('barcodes')
        .delete()
        .eq('row_id', rowId);
        
      if (error) {
        console.error('Error resetting row:', error);
        toast.error(`Failed to reset row: ${error.message}`);
        return;
      }
      
      // Remove barcodes from state
      setBarcodes(prev => prev.filter(barcode => barcode.rowId !== rowId));
      
      // Adjust daily scans for each affected user and date
      for (const [key, count] of Object.entries(userBarcodeCounts)) {
        const [userId, date] = key.split('_');
        
        // Get current daily scan count
        const { data: scanData } = await supabase
          .from('daily_scans')
          .select('id, count')
          .eq('user_id', userId)
          .eq('date', date)
          .maybeSingle();
          
        if (scanData) {
          // Subtract the count and allow negative values
          const newCount = Math.max(scanData.count - count, -999999);  // Set a reasonable lower bound
          
          await supabase
            .from('daily_scans')
            .update({ count: newCount })
            .eq('id', scanData.id);
        }
      }
      
      toast.success(`Reset ${rowBarcodes.length} barcodes successfully`);
    } catch (error: any) {
      console.error('Error in resetRow:', error.message);
      toast.error(`Failed to reset row: ${error.message}`);
    }
  };
  
  const deleteRow = async (rowId: string) => {
    try {
      // Check if the row has expected barcodes set and the current user is not a manager
      const rowToDelete = rows.find(row => row.id === rowId);
      
      if (rowToDelete?.expectedBarcodes !== null && rowToDelete?.expectedBarcodes !== undefined) {
        // This check will be done in the components that call this function
        // because we need access to isManager() from the DB context
        // This will be handled in row-card.tsx
      }
      
      // First reset the row (which will handle adjusting barcode counts)
      await resetRow(rowId);
      
      // Then delete the row
      const { error } = await supabase
        .from('rows')
        .delete()
        .eq('id', rowId);
        
      if (error) {
        console.error('Error deleting row:', error);
        toast.error(`Failed to delete row: ${error.message}`);
        return;
      }
      
      // Remove row from state
      setRows(prev => prev.filter(row => row.id !== rowId));
      
      toast.success('Row deleted successfully');
    } catch (error: any) {
      console.error('Error in deleteRow:', error.message);
      toast.error(`Failed to delete row: ${error.message}`);
    }
  };
  
  const getRowById = (rowId: string): Row | undefined => {
    return rows.find(row => row.id === rowId);
  };
  
  const countBarcodesInRow = (rowId: string): number => {
    // Count directly from barcodes for real-time accuracy
    return barcodes.filter(barcode => barcode.rowId === rowId).length;
  };

  return {
    rows,
    setRows,
    fetchRows,
    getRowsByParkId,
    addRow,
    addSubRow,
    updateRow,
    deleteRow,
    getRowById,
    resetRow,
    countBarcodesInRow
  };
};
