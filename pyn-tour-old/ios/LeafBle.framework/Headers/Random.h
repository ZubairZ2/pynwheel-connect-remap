/*******************************************************************************
 * Random.h
 * Author: Taylor Schmidt
 * Copyright WaveLynx Technologies, 2019.
 *
 * Utility to get random buffer in iOS.
 *
 ******************************************************************************/
#ifndef Random_h
#define Random_h

#include <stdlib.h>

void Random_FillBuffer(unsigned char *pBufOut, unsigned short length);

#endif
