//
//  IglooMod.m
//  SelfTour
//
//  Created by Imran Shad on 09/07/2021.
//

#import <Foundation/Foundation.h>
 #import "React/RCTBridgeModule.h"

@interface RCT_EXTERN_MODULE(IglooModule, NSObject)

RCT_EXTERN_METHOD(initIgloo:(RCTPromiseResolveBlock)resolve
rejecter:(RCTPromiseRejectBlock)reject
)
RCT_EXTERN_METHOD(scan:(RCTPromiseResolveBlock)resolve
rejecter:(RCTPromiseRejectBlock)reject
)
RCT_EXTERN_METHOD(connect:(NSString *)name blk:(NSString *)blk
                  resolver:(RCTPromiseResolveBlock)resolve
rejecter:(RCTPromiseRejectBlock)reject
)
RCT_EXTERN_METHOD(disposeConnection:(RCTPromiseResolveBlock)resolve
rejecter:(RCTPromiseRejectBlock)reject
)
RCT_EXTERN_METHOD(pair:(NSString *)name ranges:(NSArray *)ranges gmtOffset:(NSNumber *)gmtOffset
                  resolver:(RCTPromiseResolveBlock)resolve
rejecter:(RCTPromiseRejectBlock)reject
)
RCT_EXTERN_METHOD(commitPairing:(NSString *)bltAdminKey masterPin:(NSString *)masterPin
                  resolver:(RCTPromiseResolveBlock)resolve
rejecter:(RCTPromiseRejectBlock)reject
)
RCT_EXTERN_METHOD(unpair:(RCTPromiseResolveBlock)resolve
rejecter:(RCTPromiseRejectBlock)reject
)
RCT_EXTERN_METHOD(lockExist:(NSString *)name
resolver:(RCTPromiseResolveBlock)resolve
rejecter:(RCTPromiseRejectBlock)reject
)
RCT_EXTERN_METHOD(unlock:(RCTPromiseResolveBlock)resolve
rejecter:(RCTPromiseRejectBlock)reject
)
RCT_EXTERN_METHOD(lock:(RCTPromiseResolveBlock)resolve
rejecter:(RCTPromiseRejectBlock)reject
)
RCT_EXTERN_METHOD(status:(NSString *)name
                  resolver:(RCTPromiseResolveBlock)resolve
rejecter:(RCTPromiseRejectBlock)reject
)
RCT_EXTERN_METHOD(pairStatus:(RCTPromiseResolveBlock)resolve
rejecter:(RCTPromiseRejectBlock)reject
)
RCT_EXTERN_METHOD(logs:(RCTPromiseResolveBlock)resolve
rejecter:(RCTPromiseRejectBlock)reject
)
RCT_EXTERN_METHOD(autoRelock:(NSNumber *)time
                  resolver:(RCTPromiseResolveBlock)resolve
rejecter:(RCTPromiseRejectBlock)reject
)
@end
