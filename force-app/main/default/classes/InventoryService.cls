public with sharing class InventoryService {
    public InventoryService() {

    }

    @AuraEnabled(cacheable=True)
    public static List<Inventory_Item__c> LoadInventoryItem()
    {
       List<Inventory_Item__c> inventoryItems=[
         SELECT Name,SKU__c,Category__c, Unit_Cost__c
         FROM  Inventory_Item__c
        ];
       return inventoryItems;
    }
}