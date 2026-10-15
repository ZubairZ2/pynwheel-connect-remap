/*******************************************************************************
 * LeafCore.h
 * Author: Taylor Schmidt
 * Copyright WaveLynx Technologies, 2019.
 *
 * Base set of data structures and algorithms used in leaf-for-mobile.
 *
 ******************************************************************************/
#ifndef LEAF_CORE_H
#define LEAF_CORE_H

#define LEAF_BLOCK_SIZE        0x10
#define LEAF_PADDING_START     0x80
#define LEAF_SUBKEY_XOR_VAL    0x87
#define LEAF_DIVINPUT_CONST    0x01
#define LEAF_BLE_MSG_OVERHEAD  0x04
#define LEAF_MAX_BLE_MSG_VAL   400u
#define LEAF_UID_LEN           0x08
#define LEAF_BLE_MSG_PLAINTEXT 0x81
#define LEAF_BLE_MSG_CIPHER    0xC1
#define LEAF_META_LEN          0x04

#define LEAF_CP_VALUE_LEN      330u
#define LEAF_CP_OVERHEAD       42u
#define LEAF_TC_LEN            98u
#define LEAF_TC_RFU_LEN        48u

#define LEAF_CP_ID             0xCC
#define LEAF_TC_ID             0xCE

#define LEAF_CLA_PLAINTEXT     0x00
#define LEAF_CLA_CIPHER        0x80
#define LEAF_MAX_APDU_DATA_LEN 0xFF
#define LEAF_AID_LEN           5u

/*******************************************************************************
 * Types
 ******************************************************************************/
/*
 * Leaf boolean definition.
 */
typedef unsigned char bool_t;
#define false 0
#define true  1

/*
 * Leaf AES CBC encryption/decryption prototype.
 *
 * Params are as follows:
 *  - data
 *  - length
 *  - key
 *  - iv
 */
typedef short (*Leaf_AesCbc)(unsigned char *,  // data
                             unsigned short,   // length
                             unsigned char *,  // key
                             unsigned char *); // iv

/*
 * Leaf random fill prototype. Should fill a buffer with random bytes.
 *
 * Params are as follows:
 * - buffer
 * - length
 */
typedef void (*Leaf_RandomFill)(unsigned char *, // buffer to fill with random
                                unsigned short); // length

/*
 * Leaf ble msessaging tags.
 * UPDATE DESERIALIZATION FUNCTION WHEN ADDING NEW TAGS.
 */
typedef enum _leaf_tag_t
{
    leaf_tag_rsp = 0, // generice response
    leaf_tag_duid,    // device UID
    leaf_tag_authreq, // authorization request
    leaf_tag_authrsp, // authorization response
    leaf_tag_cp,      // credential payload
    leaf_tag_tc,      // transaction certificate
    leaf_tag_meta,    // keyset metadata
    leaf_tag_ivreset  // reset the iv
} leaf_tag_t;

/*
 * Leaf nfc messageing tags.
 * These represent the INS field of the APDU.
 */
typedef enum _leaf_ins_t
{
    leaf_ins_verify = 0x20,         // verification of mutual auth
    leaf_ins_external_auth = 0x82,  // auth device
    leaf_ins_get_challenge = 0x84,  // get initial device token
    leaf_ins_internal_auth = 0x88,  // auth reader
    leaf_ins_select_file = 0xA4,    // select nfc application
    leaf_ins_get_data = 0xCA,       // request data
    leaf_ins_put_data = 0xDA        // send data
} leaf_ins_t;

/*
 * Leaf response codes.
 */
typedef enum _leaf_rsp_t
{
    leaf_rsp_success = 0,
    leaf_rsp_fail,
    leaf_rsp_authrequired,
    leaf_rsp_invalid,
    leaf_rsp_multistart,   // multi message start
    leaf_rsp_multiend      // multi message end
} leaf_rsp_t;

/*
 * Leaf NFC APDU rsp codes
 */
typedef enum _leaf_sw1_t
{
    leaf_sw1_not_allowed = 0x69, // unknown command/invalid
    leaf_sw1_fail = 0x6F,        // failed known command
    leaf_sw1_success = 0x90      // successful execution
} leaf_sw1_t;

/*
 * Leaf payload identifiers for CP.
 */
typedef enum _leaf_payload_id_t
{
    leaf_id_keyset = 0,
    leaf_id_accesscontrol,
    leaf_id_configfile,
    leaf_id_passthrough,
} leaf_payload_id_t;

/*
 * Leaf id to indicate which keyset slots are active.
 */
typedef enum _leaf_active_keys_id_t
{
    leaf_key1_active = 1,
    leaf_key1and2_active = 3
} leaf_active_keys_id_t;

/*
 * Leaf BLE messaging protocol structure.
 */
typedef struct _leaf_ble_msg_t
{
    unsigned char  start;      // start sequence byte 0x81 or 0xC1
    leaf_tag_t     tag;        // msg tag
    unsigned short length;     // 2 byte msg length, serialized big endian

    // these fields are included in the length and encrypted for cipher msgs
    unsigned char  sequence;                     // 1 byte rotating sequence
    unsigned char  value[LEAF_MAX_BLE_MSG_VAL]; // msg payload
} leaf_ble_msg_t;

/*
 * Leaf NFC messaging protocol structure.
 * This follows the APDU format of ISO 7816-4
 */
typedef struct _leaf_apdu_cmd_t
{
    unsigned char cla;
    unsigned char ins;
    unsigned char p1;
    unsigned char p2;
    unsigned char lc;
    unsigned char data[LEAF_MAX_APDU_DATA_LEN];
    unsigned char le;
} leaf_apdu_cmd_t;

typedef struct _leaf_apdu_rsp_t
{
    bool_t isCipher;
    unsigned char data[LEAF_MAX_APDU_DATA_LEN];
    unsigned short dataLength;
    unsigned char sw1;
    unsigned char sw2;
} leaf_apdu_rsp_t;

/*
 * Leaf credential payload structure.
 */
typedef struct _leaf_cred_payload_t
{
    // when serialize, the CP will have a tag header of 0xCC
    unsigned short    length;                     // 2 byte payload length

    // the following fields are included in the length
    leaf_payload_id_t identifier;                 // 2 byte contents id
    unsigned char     dUid[LEAF_UID_LEN];         // device uid for cp
    unsigned char     token[LEAF_BLOCK_SIZE * 2]; // server defined token
    unsigned char     value[LEAF_CP_VALUE_LEN];   // payload contents
} leaf_cred_payload_t;

/*
 * Leaf transaction certificate structure
 */
typedef struct _leaf_transaction_cert_t
{
    // when serialized, the Tc will have a tag header of 0xCE
    unsigned short    length;                     // 2 byte length

    // the following fields are included in the length
    leaf_payload_id_t identifier;                 // 2 byte id from CP
    unsigned char     rUid[LEAF_UID_LEN];         // 8 byte reader UID
    unsigned char     dUid[LEAF_UID_LEN];         // device UID from CP
    unsigned char     token[LEAF_BLOCK_SIZE * 2]; // server token from CP
    unsigned char     rfu[LEAF_TC_RFU_LEN];       // RFU padding
} leaf_transaction_cert_t;

/*******************************************************************************
 * Global Variables
 ******************************************************************************/
/*
 * Persistent function prototypes for encryption, decryption, and random gen.
 */
extern Leaf_AesCbc Leaf_encrypt;
extern Leaf_AesCbc Leaf_decrypt;
extern Leaf_RandomFill Leaf_RandomBuffer;

/*
 * Default initialization vector for Leaf encryption.
 */
extern unsigned char Leaf_defaultIv[LEAF_BLOCK_SIZE];

/*
 * Designator for empty unused keyset metadata.
 */
extern unsigned char Leaf_emptyMetadata[LEAF_META_LEN];

/*
 * Fixed app id for nfc.
 */
extern unsigned char Leaf_nfcAid[LEAF_AID_LEN];

/*******************************************************************************
 * Global Functions
 ******************************************************************************/
void Leaf_Init(Leaf_AesCbc encrypt,
               Leaf_AesCbc decrypt,
               Leaf_RandomFill randomFill);

/*
 * Leaf algorithms
 */
void Leaf_DiversifyKey(unsigned char *pDiversifiedKey,
                       unsigned char *pUid,
                       unsigned char *pBaseKey);
void Leaf_GenerateRand(unsigned char *pRandToken);
void Leaf_GenerateRandPrime(unsigned char *pRandPrimeToken,
                            unsigned char *pRandToken);
bool_t Leaf_VerifyRandPrime(unsigned char *randPrime1,
                            unsigned char *randPrme2);

/*
 * Leaf BLE message helpers
 */
short Leaf_SerializeBleMessage(unsigned char *pDataOut,
                               leaf_ble_msg_t *pMsg,
                               unsigned char *iv,
                               unsigned char *kmd);
short Leaf_DeserializeBleMessage(leaf_ble_msg_t *pMsgOut,
                                 unsigned char *pData,
                                 unsigned short dataLength,
                                 unsigned char *iv,
                                 unsigned char *kmd);
short Leaf_AppendMsg(unsigned char *pBufOut,
                     leaf_ble_msg_t *pMsg,
                     unsigned char *iv,
                     unsigned char *kmd,
                     unsigned char *sequence);
short Leaf_ProcessNextMsg(leaf_ble_msg_t *pMsgOut,
                          unsigned char *pMsgBuf,
                          unsigned short length,
                          unsigned char *iv,
                          unsigned char *kmd,
                          unsigned char *sequence);

/*
 * Leaf NFC message helpers
 */
short Leaf_SerializeApduCmdMessage(unsigned char *pDataOut,
                                   leaf_apdu_cmd_t *pCmd,
                                   unsigned char *iv,
                                   unsigned char *key);
short Leaf_DeserializeApduCmdMessage(leaf_apdu_cmd_t *pCmdOut,
                                     unsigned char *pData,
                                     unsigned short dataLength,
                                     unsigned char *iv,
                                     unsigned char *key);
short Leaf_SerializeApduRspMessage(unsigned char *pDataOut,
                                   leaf_apdu_rsp_t *pRsp,
                                   unsigned char *iv,
                                   unsigned char *key);
short Leaf_DeserializeApduRspMessage(leaf_apdu_rsp_t *pRspOut,
                                     unsigned char *pData,
                                     unsigned short dataLength,
                                     bool_t isCipher,
                                     unsigned char *iv,
                                     unsigned char *key);
/*
 * Leaf data structure helpers
 */
short Leaf_PackCredentialPayload(unsigned char *pBufferOut,
                                 unsigned short outLength,
                                 leaf_cred_payload_t *pCp,
                                 unsigned char *kcd);
bool_t Leaf_UnpackCredentialPayload(leaf_cred_payload_t *pCpOut,
                                    unsigned char *pBufferIn,
                                    unsigned short length,
                                    unsigned char *kcd,
                                    unsigned char *dUid);
short Leaf_PackTransactionCert(unsigned char *pBufferOut,
                               unsigned short outLength,
                               leaf_transaction_cert_t *pTc,
                               unsigned char *kcd);
bool_t Leaf_UnpackTransactionCert(leaf_transaction_cert_t *pTcOut,
                                  unsigned char *pBufferIn,
                                  unsigned short lengthIn,
                                  unsigned char *kcd,
                                  unsigned char *dUid);

/*
 * Std lib replacement functions.
 */
void Leaf_memset(unsigned char *pData,
                        unsigned char value,
                        unsigned short length);
void Leaf_memcpy(unsigned char *pOutput,
                        unsigned char *pInput,
                        unsigned short length);
void Leaf_bufferLeftShift(unsigned char *pData,
                                 unsigned short length);
bool_t Leaf_memcmp(unsigned char *cmp1,
                          unsigned char *cmp2,
                          unsigned short length);
unsigned short Leaf_calcCipherLength(unsigned short length);

#endif
