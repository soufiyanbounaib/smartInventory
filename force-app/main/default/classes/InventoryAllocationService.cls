public class InventoryAllocationService {

    // One planned allocation: which line, which stock level, and how much.
    private class PlannedAllocation {
        Id allocationLineId;
        Id stockLevelId;
        Integer quantity;

        PlannedAllocation(Id lineId, Id stockId, Integer qty) {
            allocationLineId = lineId;
            stockLevelId = stockId;
            quantity = qty;
        }
    }

    public static void allocateRequest(Id allocationRequestId) {

        if (allocationRequestId == null) {
            throw new AuraHandledException(
                'An allocation request ID is required.'
            );
        }
          //Check Status
          Allocation_Request__c request = [
           SELECT Id, Status__c
          FROM Allocation_Request__c
           WHERE Id = :allocationRequestId
           LIMIT 1
            ];

           if (request.Status__c != 'Submitted') {
                throw new AuraHandledException(
              'Only submitted requests can be allocated.'
              );
            }
        List<Allocation_Line__c> allocationLines = [
            SELECT Id, Inventory_Item__c, Quantity_Requested__c
            FROM Allocation_Line__c
            WHERE Allocation_Request__c = :allocationRequestId
            
        ];
       //Check duplicate allocation
       List<Stock_Allocation__c> existingAllocations = [
                SELECT Id
                FROM Stock_Allocation__c
                WHERE Allocation_Line__r.Allocation_Request__c = :allocationRequestId
               LIMIT 1
                  ];

             if (!existingAllocations.isEmpty()) {
              throw new AuraHandledException(
             'This request has already been processed.'
            );
          }
        if (allocationLines.isEmpty()) {
            throw new AuraHandledException(
                'The allocation request has no allocation lines.'
            );
        }

        Set<Id> inventoryItemIds = new Set<Id>();

        for (Allocation_Line__c line : allocationLines) {
            if (line.Inventory_Item__c == null) {
                throw new AuraHandledException(
                    'Every allocation line must have an inventory item.'
                );
            }

            inventoryItemIds.add(line.Inventory_Item__c);
        }

        // Lock the stock records before calculating availability.
        List<Stock_Level__c> stockLevels = [
            SELECT Id, Inventory_Item__c, Warehouse__c,
                   Quantity_On_Hand__c, Quantity_Reserved__c
            FROM Stock_Level__c
            WHERE Inventory_Item__c IN :inventoryItemIds
            FOR UPDATE
        ];

        // Calculate everything before performing any DML.
        List<PlannedAllocation> plans =
            validateAndCalculateAllocations(
                allocationLines,
                stockLevels
            );

        List<Stock_Allocation__c> allocationsToInsert =
            new List<Stock_Allocation__c>();

        Map<Id, Integer> quantityToReserveByStock =
            new Map<Id, Integer>();

        for (PlannedAllocation plan : plans) {
            allocationsToInsert.add(new Stock_Allocation__c(
                Allocation_Line__c = plan.allocationLineId,
                Stock_Level__c = plan.stockLevelId,
                Quantity_Allocated__c = plan.quantity
            ));

            Integer previousQuantity =
                quantityToReserveByStock.containsKey(plan.stockLevelId)
                ? quantityToReserveByStock.get(plan.stockLevelId)
                : 0;

            quantityToReserveByStock.put(
                plan.stockLevelId,
                previousQuantity + plan.quantity
            );
        }

       List<Stock_Level__c> stocksToUpdate =
        new List<Stock_Level__c>();

         for (Stock_Level__c stock : stockLevels) {

         Integer quantityToAdd =
        quantityToReserveByStock.get(stock.Id);

          if (quantityToAdd != null && quantityToAdd > 0) {

        Integer currentReserved =
            stock.Quantity_Reserved__c == null
            ? 0
            : stock.Quantity_Reserved__c.intValue();

        stocksToUpdate.add(new Stock_Level__c(
            Id = stock.Id,
             Quantity_Reserved__c = currentReserved + quantityToAdd
         ));
         }
            }
        // All-or-none DML. An unhandled failure rolls back this transaction.
          insert allocationsToInsert;
          update stocksToUpdate;
         }

    private static List<PlannedAllocation>
        validateAndCalculateAllocations(
            List<Allocation_Line__c> allocationLines,
            List<Stock_Level__c> stockLevels
        ) {

        List<PlannedAllocation> plans =
            new List<PlannedAllocation>();

        // Track remaining availability so the same stock cannot
        // be counted twice across multiple allocation lines.
        Map<Id, Integer> availableByStock =
            new Map<Id, Integer>();

        for (Stock_Level__c stock : stockLevels) {
            Integer onHand = stock.Quantity_On_Hand__c == null
                ? 0
                : stock.Quantity_On_Hand__c.intValue();

            Integer reserved = stock.Quantity_Reserved__c == null
                ? 0
                : stock.Quantity_Reserved__c.intValue();

            Integer available = onHand - reserved;

            if (available < 0) {
                throw new AuraHandledException(
                    'Invalid stock data: reserved quantity exceeds quantity on hand.'
                );
            }

            availableByStock.put(stock.Id, available);
        }

        for (Allocation_Line__c line : allocationLines) {
            if (line.Quantity_Requested__c == null ||
                line.Quantity_Requested__c <= 0) {
                throw new AuraHandledException(
                    'Requested quantities must be greater than zero.'
                );
            }

            Integer remaining =
                line.Quantity_Requested__c.intValue();

            for (Stock_Level__c stock : stockLevels) {
                if (stock.Inventory_Item__c != line.Inventory_Item__c ||
                    remaining == 0) {
                    continue;
                }

                Integer available = availableByStock.get(stock.Id);

                if (available == null || available <= 0) {
                    continue;
                }

                Integer quantityToAllocate =
                    available < remaining ? available : remaining;

                plans.add(new PlannedAllocation(
                    line.Id,
                    stock.Id,
                    quantityToAllocate
                ));

                availableByStock.put(
                    stock.Id,
                    available - quantityToAllocate
                );

                remaining -= quantityToAllocate;
            }

            if (remaining > 0) {
                throw new AuraHandledException(
                    'Insufficient stock to fulfill every allocation line.'
                );
            }
        }

        return plans;
    }
}