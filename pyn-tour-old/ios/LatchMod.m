//
//  LatchMod.m
//  SelfTour
//
//  Created by Imran Shad on 6/15/23.
//
#import <Foundation/Foundation.h>
#import "React/RCTBridgeModule.h"
@interface RCT_EXTERN_MODULE(LatchModule, NSObject)
RCT_EXTERN_METHOD(configuereLatch:(NSString *)token callback:(RCTResponseSenderBlock)callback)
RCT_EXTERN_METHOD(unlock:(NSString *)lockID callback:(RCTResponseSenderBlock)callback)
RCT_EXTERN_METHOD(locks:(RCTResponseSenderBlock)callback)
@end
