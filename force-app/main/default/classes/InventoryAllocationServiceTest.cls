@IsTest
private class InventoryAllocationServiceTest {

    @TestSetup
    static void createTestData() {

        // 1. Create inventory item
        Inventory_Item__c item = new Inventory_Item__c(
            Name = 'Test Monitor',
            SKU__c = 'MON-TEST-001',
            Category__c = 'Monitor',
            Unit_Cost__c = 200,
            Active__c = true
        );
        insert item;

        // 2. Create warehouses
        List<Warehouse__c> warehouses = new List<Warehouse__c>{
            new Warehouse__c(
                Name = 'Warehouse A',
                Location__c = 'Rabat',
                Active__c = true
            ),
            new Warehouse__c(
                Name = 'Warehouse B',
                Location__c = 'Casablanca',
                Active__c = true
            )
        };
        insert warehouses;

        // 3. Create stock levels
        List<Stock_Level__c> stockLevels = new List<Stock_Level__c>{
            new Stock_Level__c(
                Inventory_Item__c = item.Id,
                Warehouse__c = warehouses[0].Id,
                Quantity_On_Hand__c = 5,
                Quantity_Reserved__c = 0,
                Reorder_Threshold__c = 2
            ),
            new Stock_Level__c(
                Inventory_Item__c = item.Id,
                Warehouse__c = warehouses[1].Id,
                Quantity_On_Hand__c = 10,
                Quantity_Reserved__c = 0,
                Reorder_Threshold__c = 2
            )
        };
        insert stockLevels;

        // 4. Create allocation request
        Allocation_Request__c request = new Allocation_Request__c(
            Requesting_Team__c = 'IT',
            Priority__c = 'Medium',
            Status__c = 'Submitted'
        );
        insert request;

        // 5. Create allocation line
        Allocation_Line__c line = new Allocation_Line__c(
            Allocation_Request__c = request.Id,
            Inventory_Item__c = item.Id,
            Quantity_Requested__c = 12,
            Quantity_Approved__c = 0
        );
        insert line;
    }

    @IsTest
    static void testSuccessfulAllocationAcrossWarehouses() {

        // Retrieve test records
        Allocation_Request__c request = [
            SELECT Id
            FROM Allocation_Request__c
            WHERE Requesting_Team__c = 'IT'
            LIMIT 1
        ];

        Test.startTest();

        InventoryAllocationService.allocateRequest(request.Id);

        Test.stopTest();

        // Verify allocation records
        List<Stock_Allocation__c> allocations = [
            SELECT Quantity_Allocated__c,
                   Stock_Level__r.Warehouse__r.Name
            FROM Stock_Allocation__c
        ];

        Decimal totalAllocated = 0;

        for (Stock_Allocation__c allocation : allocations) {
            totalAllocated += allocation.Quantity_Allocated__c;
        }

        System.assertEquals(
            12,
            totalAllocated,
            'The service should allocate all 12 requested units.'
        );

        System.assertEquals(
            2,
            allocations.size(),
            'The allocation should use both warehouses.'
        );

        // Verify reserved quantities
        List<Stock_Level__c> updatedStockLevels = [
            SELECT Quantity_Reserved__c,
                   Warehouse__r.Name
            FROM Stock_Level__c
        ];

        Map<String, Decimal> reservedByWarehouse =
            new Map<String, Decimal>();

        for (Stock_Level__c stock : updatedStockLevels) {
            reservedByWarehouse.put(
                stock.Warehouse__r.Name,
                stock.Quantity_Reserved__c
            );
        }

        System.assertEquals(
            5,
            reservedByWarehouse.get('Warehouse A'),
            'Warehouse A should reserve 5 units.'
        );

        System.assertEquals(
            7,
            reservedByWarehouse.get('Warehouse B'),
            'Warehouse B should reserve 7 units.'
        );
    }
    
    
    @IsTest
      static void testInsufficientStock() {

     Allocation_Request__c request = [
        SELECT Id
        FROM Allocation_Request__c
        WHERE Requesting_Team__c = 'IT'
        LIMIT 1
     ];

     Allocation_Line__c line = [
        SELECT Id, Quantity_Requested__c
        FROM Allocation_Line__c
        WHERE Allocation_Request__c = :request.Id
        LIMIT 1
     ];

     line.Quantity_Requested__c = 20;
     update line;

     Test.startTest();

      try {
        InventoryAllocationService.allocateRequest(request.Id);
        System.assert(false, 'An exception should be thrown when stock is insufficient.');
      } catch (AuraHandledException e) {
          System.assert(
        e.getMessage().contains('Script-thrown exception') ||
        e.getMessage().contains('Insufficient stock'),
         'The service should reject requests when stock is insufficient.'
           );
          }

      Test.stopTest();

       System.assertEquals(
        0,
        [SELECT COUNT() FROM Stock_Allocation__c],
        'No allocation records should be created.'
      );

      for (Stock_Level__c stock : [
        SELECT Quantity_Reserved__c
        FROM Stock_Level__c
       ]) {
        System.assertEquals(
            0,
            stock.Quantity_Reserved__c,
            'Reserved quantities should remain unchanged.'
        );
     }
  }
    
       @IsTest
       static void testPreventDuplicateProcessing() {

        Allocation_Request__c request = [
        SELECT Id
        FROM Allocation_Request__c
        WHERE Requesting_Team__c = 'IT'
        LIMIT 1
          ];

         // First processing should succeed.
           InventoryAllocationService.allocateRequest(request.Id);

         // Second processing should be rejected.
              Test.startTest();

          Boolean exceptionThrown = false;

            try {
            InventoryAllocationService.allocateRequest(request.Id);
     }       catch (AuraHandledException e) {
             exceptionThrown = true;
           }

    Test.stopTest();

    System.assertEquals(
        true,
        exceptionThrown,
        'The service should prevent processing the same request twice.'
    );

    System.assertEquals(
        2,
        [SELECT COUNT() FROM Stock_Allocation__c],
        'The second attempt should not create additional allocations.'
    );
  }  
    @IsTest
     static void testRejectNonSubmittedRequest() {

        Allocation_Request__c request = [
        SELECT Id, Status__c
        FROM Allocation_Request__c
        WHERE Requesting_Team__c = 'IT'
        LIMIT 1
        ];

        request.Status__c = 'Draft';
        update request;

        Test.startTest();

        Boolean exceptionThrown = false;
 
       try {
        InventoryAllocationService.allocateRequest(request.Id);
       } catch (AuraHandledException e) {
        exceptionThrown = true;
      }

       Test.stopTest();
  
       System.assertEquals(
        true,
        exceptionThrown,
        'The service should reject requests that are not Submitted.'
       );

       System.assertEquals(
        0,
        [SELECT COUNT() FROM Stock_Allocation__c],
        'No allocation records should be created.'
       );
   }
}