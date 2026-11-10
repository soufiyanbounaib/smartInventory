public with sharing class StockLevelService {
     @AuraEnabled(cacheable=true)
    public static List<Stock_Level__c> LoadStockLevels() {

        return [
            SELECT Id,
                   Inventory_Item__c,
                   Inventory_Item__r.Name,
                   Warehouse__c,
                   Warehouse__r.Name,
                   Quantity_On_Hand__c,
                   Quantity_Reserved__c,
                   Reorder_Threshold__c
            FROM Stock_Level__c
            ORDER BY CreatedDate DESC
        ];
    }
}