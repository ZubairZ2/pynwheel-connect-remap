/*******************************************************************************
 * LeafCentral.h
 * Author: Taylor Schmidt
 * Copyright WaveLynx Technologies, 2019.
 *
 * Leaf Central messaging functionality.
 *
 ******************************************************************************/
#ifndef LEAF_CENTRAL_H
#define LEAF_CENTRAL_H

#include "LeafCore.h"

/*******************************************************************************
 * Types
 ******************************************************************************/
/*
 * State machine used for transaction.
 */
typedef enum _leaf_central_status_t
{
    central_challenge = 0, // connected send dUID and AUTH_REQ
    central_authenticated, // AUTH_RSP + AUTH_REQ recevied and validated
    central_mutual_auth,   // send AUTH_RSP
    central_transfer,      // send CP
    central_done,          // TC received
} leaf_central_status_t;

/*******************************************************************************
 * Global Functions
 ******************************************************************************/
void Leaf_CentralStartTransaction(unsigned char *pCp,
                                  unsigned short cpLength,
                                  unsigned char *kmd,
                                  unsigned char *dUid,
                                  bool_t clearSequence,
                                  bool_t useSmallMtu);
short Leaf_CentralGetState(void);
void Leaf_CentralGetMetadata(unsigned char *pMetaOut);
short Leaf_CentralNextMessage(unsigned char *pMsgOut);
short Leaf_CentralHandleMessage(unsigned char *pMsg, unsigned short length);
unsigned short Leaf_CentralGetTransactionCert(unsigned char *pTcOut);

#endif
