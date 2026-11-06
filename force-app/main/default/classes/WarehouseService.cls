public with sharing class WarehouseService {
    public WarehouseService() {

    }

    @AuraEnabled(cacheable=True)
    public static List<Warehouse__c>  getWarehouses()
    { 
         List<Warehouse__c> warehouses=[SELECT Id,Name,Location__c,Active__c FROM Warehouse__c];
         return warehouses;
    }
}