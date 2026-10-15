/******************************************************************************
 * Aes.h
 * Author: Taylor Schmidt (cbc implementation + aes-min mods)
 *
 * adaptation of open source aes-min library into single .h/.c file + cbc
 * support
 ******************************************************************************/
#ifndef AES_H
#define AES_H

/**************************************************************************
 * macros
 **************************************************************************/
#define AES_BLOCK_SIZE              16u
#define AES_COLUMN_SIZE             4u
#define AES_NUM_COLUMNS             4u
#define AES_KEY_SCHEDULE_WORD_SIZE  4u
#define AES128_NUM_ROUNDS           10u
#define AES128_KEY_SIZE             16u
#define AES128_KEY_SCHEDULE_SIZE    (AES_BLOCK_SIZE * (AES128_NUM_ROUNDS + 1u))
#define AES_REDUCE_BYTE             0x1Bu
#define AES_2_INVERSE               141u
#define AES_KEY_SCHEDULE_FIRST_RCON 1u

/**************************************************************************
 * inline functions
 **************************************************************************/
static inline void aes_block_xor(unsigned char p_block[AES_BLOCK_SIZE],
                                 const unsigned char p_data[AES_BLOCK_SIZE])
{
    unsigned char i;
    
    for (i = 0; i < AES_BLOCK_SIZE; ++i)
    {
        p_block[i] ^= p_data[i];
    }
}

static inline unsigned char aes_mul(unsigned char a)
{
    return (a << 1u) ^ ((-(a >= 0x80u)) & AES_REDUCE_BYTE);
}

/**************************************************************************
 * global functions
 **************************************************************************/
short AesEncryptCbc(unsigned char *data,
                    unsigned short length,
                    unsigned char key[AES_BLOCK_SIZE],
                    unsigned char iv[AES_BLOCK_SIZE]);
short AesDecryptCbc(unsigned char *data,
                    unsigned short length,
                    unsigned char key[AES_BLOCK_SIZE],
                    unsigned char iv[AES_BLOCK_SIZE]);

#endif
