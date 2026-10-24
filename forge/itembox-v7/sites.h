/* Item-box V7 patch table for the recompiled MHGU 1.4.0 PC build.
 *
 * 123 rows, one per line of the @enabled block of MHGU/patch/1.4.0.pchtxt (V7), in pchtxt
 * order. vaddr is module-relative (module "main"); the pchtxt uses flat file offsets, so
 * vaddr = flat - 0x100 (pchtxt header: "Lines = flat file offsets (vaddr+0x100)").
 *
 * orig_word    = the unpatched 1.4.0 instruction word, from the audited table in
 *                docs/patches/item-box-v7-plugin-spec.md section 2 (read from the 1.4.0
 *                disassembly; identical to MHGU/forge/boxprobe/sites.h).
 * patched_word = the V7 replacement word, decoded from patch/1.4.0.pchtxt (source of truth):
 *                movw = 0xE3000000 | imm4 << 16 | Rd << 12 | imm12, cmp = 0xE3500000 |
 *                Rn << 16 | imm8 (spec Appendix A). Cross-checked row by row: 113 movw,
 *                9 cmp and 1 bx lr, matching the section-3 instruction mix.
 *
 * SPDX-License-Identifier: GPL-3.0-or-later */
#pragma once
#include <stdint.h>

typedef struct IboxSite {
    uint32_t row;          /* pchtxt line number inside @enabled, 1-based */
    uint32_t vaddr;        /* offset inside module "main" = flat file offset - 0x100 */
    uint32_t orig_word;    /* original 1.4.0 instruction word */
    uint32_t patched_word; /* V7 replacement word */
} IboxSite;

static const IboxSite kIboxSites[] = {
    {1, 0x00198F44u, 0xE3022406u, 0xE3022ED6u}, /* movw r2,#0x2406  -> movw r2,#0x2ED6 */
    {2, 0x00198F48u, 0xE300C8FBu, 0xE300CBAFu}, /* movw r12,#0x8FB  -> movw r12,#0xBAF */
    {3, 0x00198F4Cu, 0xE30038FDu, 0xE3003BB1u}, /* movw r3,#0x8FD   -> movw r3,#0xBB1 */
    {4, 0x00198FA0u, 0xE300C8FCu, 0xE300CBB0u}, /* movw r12,#0x8FC  -> movw r12,#0xBB0 */
    {5, 0x00198FECu, 0xE3022408u, 0xE3022ED8u}, /* movw r2,#0x2408  -> movw r2,#0x2ED8 */
    {6, 0x00198FFCu, 0xE30028FCu, 0xE3002BB0u}, /* movw r2,#0x8FC   -> movw r2,#0xBB0 */
    {7, 0x0019A4F8u, 0xE30078FCu, 0xE3007BB0u}, /* movw r7,#0x8FC   -> movw r7,#0xBB0 */
    {8, 0x0019A568u, 0xE30058FCu, 0xE3005BB0u}, /* movw r5,#0x8FC   -> movw r5,#0xBB0 */
    {9, 0x003E8A10u, 0xE30018FCu, 0xE3001BB0u}, /* movw r1,#0x8FC   -> movw r1,#0xBB0 */
    {10, 0x0019A548u, 0xE3A02EFFu, 0xE3002985u}, /* mov r2,#0xFF0    -> movw r2,#0x985 */
    {11, 0x0019A5C0u, 0xE3A02EFFu, 0xE3002985u}, /* mov r2,#0xFF0    -> movw r2,#0x985 */
    {12, 0x0019AB04u, 0xE35C0018u, 0xE35C000Eu}, /* cmp r12,#0x18    -> cmp r12,#0x0E */
    {13, 0x0019AB4Cu, 0xE3510017u, 0xE351000Du}, /* cmp r1,#0x17     -> cmp r1,#0x0D */
    {14, 0x0019ABB0u, 0xE3510018u, 0xE351000Eu}, /* cmp r1,#0x18     -> cmp r1,#0x0E */
    {15, 0x0019ABCCu, 0xE3510018u, 0xE351000Eu}, /* cmp r1,#0x18     -> cmp r1,#0x0E */
    {16, 0x0019ABE8u, 0xE3510017u, 0xE351000Du}, /* cmp r1,#0x17     -> cmp r1,#0x0D */
    {17, 0x0019A8E4u, 0xE30203F0u, 0xE3020EC0u}, /* movw r0,#0x23F0  -> movw r0,#0x2EC0 */
    {18, 0x0019A8F4u, 0xE30223F0u, 0xE3022EC0u}, /* movw r2,#0x23F0  -> movw r2,#0x2EC0 */
    {19, 0x0019AA44u, 0xE30223F0u, 0xE3022EC0u}, /* movw r2,#0x23F0  -> movw r2,#0x2EC0 */
    {20, 0x0019AA90u, 0xE30203F0u, 0xE3020EC0u}, /* movw r0,#0x23F0  -> movw r0,#0x2EC0 */
    {21, 0x0019AA9Cu, 0xE30223F0u, 0xE3022EC0u}, /* movw r2,#0x23F0  -> movw r2,#0x2EC0 */
    {22, 0x0019AAB4u, 0xE30223F0u, 0xE3022EC0u}, /* movw r2,#0x23F0  -> movw r2,#0x2EC0 */
    {23, 0x00198F04u, 0xE92D4010u, 0xE3000BB0u}, /* push {r4,lr}     -> movw r0,#0xBB0 */
    {24, 0x00198F08u, 0xE59F0030u, 0xE12FFF1Eu}, /* ldr r0,[pc,#0x30]-> bx lr */
    {25, 0x00198E74u, 0xE2800FFAu, 0xE3000BB0u}, /* add r0,r0,#0x3E8 -> movw r0,#0xBB0 */
    {26, 0x00198F38u, 0xE2800FFAu, 0xE3000BB0u}, /* add r0,r0,#0x3E8 -> movw r0,#0xBB0 */
    {27, 0x001990BCu, 0xE2800FFAu, 0xE3000BB0u}, /* add r0,r0,#0x3E8 -> movw r0,#0xBB0 */
    {28, 0x00199174u, 0xE2800FFAu, 0xE3000BB0u}, /* add r0,r0,#0x3E8 -> movw r0,#0xBB0 */
    {29, 0x0019925Cu, 0xE2800FFAu, 0xE3000BB0u}, /* add r0,r0,#0x3E8 -> movw r0,#0xBB0 */
    {30, 0x001992D8u, 0xE2800FFAu, 0xE3000BB0u}, /* add r0,r0,#0x3E8 -> movw r0,#0xBB0 */
    {31, 0x0019941Cu, 0xE2800FFAu, 0xE3000BB0u}, /* add r0,r0,#0x3E8 -> movw r0,#0xBB0 */
    {32, 0x001994F0u, 0xE2800FFAu, 0xE3000BB0u}, /* add r0,r0,#0x3E8 -> movw r0,#0xBB0 */
    {33, 0x00199618u, 0xE2800FFAu, 0xE3000BB0u}, /* add r0,r0,#0x3E8 -> movw r0,#0xBB0 */
    {34, 0x001996A0u, 0xE2800FFAu, 0xE3000BB0u}, /* add r0,r0,#0x3E8 -> movw r0,#0xBB0 */
    {35, 0x00199718u, 0xE2800FFAu, 0xE3000BB0u}, /* add r0,r0,#0x3E8 -> movw r0,#0xBB0 */
    {36, 0x0019980Cu, 0xE2800FFAu, 0xE3000BB0u}, /* add r0,r0,#0x3E8 -> movw r0,#0xBB0 */
    {37, 0x00199900u, 0xE2800FFAu, 0xE3000BB0u}, /* add r0,r0,#0x3E8 -> movw r0,#0xBB0 */
    {38, 0x00199998u, 0xE2800FFAu, 0xE3000BB0u}, /* add r0,r0,#0x3E8 -> movw r0,#0xBB0 */
    {39, 0x00199A10u, 0xE2800FFAu, 0xE3000BB0u}, /* add r0,r0,#0x3E8 -> movw r0,#0xBB0 */
    {40, 0x00199AC8u, 0xE2800FFAu, 0xE3000BB0u}, /* add r0,r0,#0x3E8 -> movw r0,#0xBB0 */
    {41, 0x00199B68u, 0xE2800FFAu, 0xE3000BB0u}, /* add r0,r0,#0x3E8 -> movw r0,#0xBB0 */
    {42, 0x00199BECu, 0xE2800FFAu, 0xE3000BB0u}, /* add r0,r0,#0x3E8 -> movw r0,#0xBB0 */
    {43, 0x00199DE8u, 0xE2800FFAu, 0xE3000BB0u}, /* add r0,r0,#0x3E8 -> movw r0,#0xBB0 */
    {44, 0x00199E40u, 0xE2800FFAu, 0xE3000BB0u}, /* add r0,r0,#0x3E8 -> movw r0,#0xBB0 */
    {45, 0x00199F34u, 0xE2800FFAu, 0xE3000BB0u}, /* add r0,r0,#0x3E8 -> movw r0,#0xBB0 */
    {46, 0x00199F9Cu, 0xE2800FFAu, 0xE3000BB0u}, /* add r0,r0,#0x3E8 -> movw r0,#0xBB0 */
    {47, 0x0019A020u, 0xE2800FFAu, 0xE3000BB0u}, /* add r0,r0,#0x3E8 -> movw r0,#0xBB0 */
    {48, 0x0019A1D8u, 0xE2800FFAu, 0xE3000BB0u}, /* add r0,r0,#0x3E8 -> movw r0,#0xBB0 */
    {49, 0x0019A248u, 0xE2800FFAu, 0xE3000BB0u}, /* add r0,r0,#0x3E8 -> movw r0,#0xBB0 */
    {50, 0x0019A2C0u, 0xE2800FFAu, 0xE3000BB0u}, /* add r0,r0,#0x3E8 -> movw r0,#0xBB0 */
    {51, 0x0019A348u, 0xE2800FFAu, 0xE3000BB0u}, /* add r0,r0,#0x3E8 -> movw r0,#0xBB0 */
    {52, 0x0019A3F0u, 0xE2800FFAu, 0xE3000BB0u}, /* add r0,r0,#0x3E8 -> movw r0,#0xBB0 */
    {53, 0x0019A464u, 0xE2800FFAu, 0xE3000BB0u}, /* add r0,r0,#0x3E8 -> movw r0,#0xBB0 */
    {54, 0x0019AFC0u, 0xE2800FFAu, 0xE3000BB0u}, /* add r0,r0,#0x3E8 -> movw r0,#0xBB0 */
    {55, 0x00199C10u, 0xE302E40Au, 0xE302EEDAu}, /* movw r14,#0x240A  -> movw r14,#0x2EDA */
    {56, 0x00199C9Cu, 0xE302040Au, 0xE3020EDAu}, /* movw r0,#0x240A   -> movw r0,#0x2EDA */
    {57, 0x00199D84u, 0xE302040Au, 0xE3020EDAu}, /* movw r0,#0x240A   -> movw r0,#0x2EDA */
    {58, 0x00199B20u, 0xE302040Cu, 0xE3020EDCu}, /* movw r0,#0x240C   -> movw r0,#0x2EDC */
    {59, 0x00199C00u, 0xE302C40Cu, 0xE302CEDCu}, /* movw r12,#0x240C  -> movw r12,#0x2EDC */
    {60, 0x00198E88u, 0xE30417E0u, 0xE30512B0u}, /* movw r1,#0x47E0   -> movw r1,#0x52B0 */
    {61, 0x00199B04u, 0xE30407FAu, 0xE30502CAu}, /* movw r0,#0x47FA   -> movw r0,#0x52CA */
    {62, 0x00198C00u, 0xE30519D8u, 0xE30614A8u}, /* movw r1,#0x59D8   -> movw r1,#0x64A8 */
    {63, 0x00198C98u, 0xE30519D8u, 0xE30614A8u}, /* movw r1,#0x59D8   -> movw r1,#0x64A8 */
    {64, 0x00199EECu, 0xE30509F2u, 0xE30604C2u}, /* movw r0,#0x59F2   -> movw r0,#0x64C2 */
    {65, 0x00199F54u, 0xE30509F2u, 0xE30604C2u}, /* movw r0,#0x59F2   -> movw r0,#0x64C2 */
    {66, 0x00199FBCu, 0xE30509F2u, 0xE30604C2u}, /* movw r0,#0x59F2   -> movw r0,#0x64C2 */
    {67, 0x0019A11Cu, 0xE30519F2u, 0xE30614C2u}, /* movw r1,#0x59F2   -> movw r1,#0x64C2 */
    {68, 0x0019A1F8u, 0xE30509F2u, 0xE30604C2u}, /* movw r0,#0x59F2   -> movw r0,#0x64C2 */
    {69, 0x0019A268u, 0xE30509F2u, 0xE30604C2u}, /* movw r0,#0x59F2   -> movw r0,#0x64C2 */
    {70, 0x0019A2E0u, 0xE30509F2u, 0xE30604C2u}, /* movw r0,#0x59F2   -> movw r0,#0x64C2 */
    {71, 0x0019A368u, 0xE30509F2u, 0xE30604C2u}, /* movw r0,#0x59F2   -> movw r0,#0x64C2 */
    {72, 0x0019A414u, 0xE30509F2u, 0xE30604C2u}, /* movw r0,#0x59F2   -> movw r0,#0x64C2 */
    {73, 0x0019A4E0u, 0xE30519F2u, 0xE30614C2u}, /* movw r1,#0x59F2   -> movw r1,#0x64C2 */
    {74, 0x00716A28u, 0xE30529F2u, 0xE30624C2u}, /* movw r2,#0x59F2   -> movw r2,#0x64C2 */
    {75, 0x00717388u, 0xE30529F2u, 0xE30624C2u}, /* movw r2,#0x59F2   -> movw r2,#0x64C2 */
    {76, 0x0071BF8Cu, 0xE30539F2u, 0xE30634C2u}, /* movw r3,#0x59F2   -> movw r3,#0x64C2 */
    {77, 0x0071C694u, 0xE30539F2u, 0xE30634C2u}, /* movw r3,#0x59F2   -> movw r3,#0x64C2 */
    {78, 0x0019A8FCu, 0xE30612D6u, 0xE3061DA6u}, /* movw r1,#0x62D6   -> movw r1,#0x6DA6 */
    {79, 0x00198BE8u, 0xE30612F0u, 0xE3061DC0u}, /* movw r1,#0x62F0   -> movw r1,#0x6DC0 */
    {80, 0x00198C80u, 0xE30612F0u, 0xE3061DC0u}, /* movw r1,#0x62F0   -> movw r1,#0x6DC0 */
    {81, 0x00198CE4u, 0xE30602F0u, 0xE3060DC0u}, /* movw r0,#0x62F0   -> movw r0,#0x6DC0 */
    {82, 0x00198D40u, 0xE30602F0u, 0xE3060DC0u}, /* movw r0,#0x62F0   -> movw r0,#0x6DC0 */
    {83, 0x0019A8ECu, 0xE30612F0u, 0xE3061DC0u}, /* movw r1,#0x62F0   -> movw r1,#0x6DC0 */
    {84, 0x0019AA98u, 0xE30612F0u, 0xE3061DC0u}, /* movw r1,#0x62F0   -> movw r1,#0x6DC0 */
    {85, 0x0019AAB0u, 0xE30612F0u, 0xE3061DC0u}, /* movw r1,#0x62F0   -> movw r1,#0x6DC0 */
    {86, 0x0019AACCu, 0xE30602F0u, 0xE3060DC0u}, /* movw r0,#0x62F0   -> movw r0,#0x6DC0 */
    {87, 0x0019A544u, 0xE30602F4u, 0xE3060DC4u}, /* movw r0,#0x62F4   -> movw r0,#0x6DC4 */
    {88, 0x0019A5BCu, 0xE30602F4u, 0xE3060DC4u}, /* movw r0,#0x62F4   -> movw r0,#0x6DC4 */
    {89, 0x0019A6D4u, 0xE30602F4u, 0xE3060DC4u}, /* movw r0,#0x62F4   -> movw r0,#0x6DC4 */
    {90, 0x0019A87Cu, 0xE30602F4u, 0xE3060DC4u}, /* movw r0,#0x62F4   -> movw r0,#0x6DC4 */
    {91, 0x0019AB7Cu, 0xE30602F4u, 0xE3060DC4u}, /* movw r0,#0x62F4   -> movw r0,#0x6DC4 */
    {92, 0x0019ABACu, 0xE30632F4u, 0xE3063DC4u}, /* movw r3,#0x62F4   -> movw r3,#0x6DC4 */
    {93, 0x0019ABC8u, 0xE30632F4u, 0xE3063DC4u}, /* movw r3,#0x62F4   -> movw r3,#0x6DC4 */
    {94, 0x0019B19Cu, 0xE30602F4u, 0xE3060DC4u}, /* movw r0,#0x62F4   -> movw r0,#0x6DC4 */
    {95, 0x0019B218u, 0xE30602F4u, 0xE3060DC4u}, /* movw r0,#0x62F4   -> movw r0,#0x6DC4 */
    {96, 0x0019B270u, 0xE30602F4u, 0xE3060DC4u}, /* movw r0,#0x62F4   -> movw r0,#0x6DC4 */
    {97, 0x0019B370u, 0xE30612F4u, 0xE3061DC4u}, /* movw r1,#0x62F4   -> movw r1,#0x6DC4 */
    {98, 0x00198E98u, 0xE306031Du, 0xE3060DEDu}, /* movw r0,#0x631D   -> movw r0,#0x6DED */
    {99, 0x0019A780u, 0xE306031Du, 0xE3060DEDu}, /* movw r0,#0x631D   -> movw r0,#0x6DED */
    {100, 0x0019A890u, 0xE306031Du, 0xE3060DEDu}, /* movw r0,#0x631D  -> movw r0,#0x6DED */
    {101, 0x0019B2CCu, 0xE306231Du, 0xE3062DEDu}, /* movw r2,#0x631D  -> movw r2,#0x6DED */
    {102, 0x0019B31Cu, 0xE306231Du, 0xE3062DEDu}, /* movw r2,#0x631D  -> movw r2,#0x6DED */
    {103, 0x0019ABFCu, 0xE306931Eu, 0xE3069DEEu}, /* movw r9,#0x631E  -> movw r9,#0x6DEE */
    {104, 0x0019B098u, 0xE306931Eu, 0xE3069DEEu}, /* movw r9,#0x631E  -> movw r9,#0x6DEE */
    {105, 0x0019B22Cu, 0xE306131Eu, 0xE3061DEEu}, /* movw r1,#0x631E  -> movw r1,#0x6DEE */
    {106, 0x0019B284u, 0xE306131Eu, 0xE3061DEEu}, /* movw r1,#0x631E  -> movw r1,#0x6DEE */
    {107, 0x0019B2DCu, 0xE306231Eu, 0xE3062DEEu}, /* movw r2,#0x631E  -> movw r2,#0x6DEE */
    {108, 0x0019B32Cu, 0xE306231Eu, 0xE3062DEEu}, /* movw r2,#0x631E  -> movw r2,#0x6DEE */
    {109, 0x0019A650u, 0xE3060320u, 0xE3060DF0u}, /* movw r0,#0x6320  -> movw r0,#0x6DF0 */
    {110, 0x0019A810u, 0xE3061320u, 0xE3061DF0u}, /* movw r1,#0x6320  -> movw r1,#0x6DF0 */
    {111, 0x0019AAECu, 0xE3061320u, 0xE3061DF0u}, /* movw r1,#0x6320  -> movw r1,#0x6DF0 */
    {112, 0x0019AE8Cu, 0xE3060320u, 0xE3060DF0u}, /* movw r0,#0x6320  -> movw r0,#0x6DF0 */
    {113, 0x0019B128u, 0xE3061320u, 0xE3061DF0u}, /* movw r1,#0x6320  -> movw r1,#0x6DF0 */
    {114, 0x00198BD4u, 0xE30712E4u, 0xE3071DB4u}, /* movw r1,#0x72E4  -> movw r1,#0x7DB4 */
    {115, 0x0019B478u, 0xE30732E4u, 0xE3073DB4u}, /* movw r3,#0x72E4  -> movw r3,#0x7DB4 */
    {116, 0x003D925Cu, 0xE30702E4u, 0xE3070DB4u}, /* movw r0,#0x72E4  -> movw r0,#0x7DB4 */
    {117, 0x005B807Cu, 0xE302240Au, 0xE3022EDAu}, /* movw r2,#0x240A  -> movw r2,#0x2EDA */
    {118, 0x005B8084u, 0xE30539F2u, 0xE30634C2u}, /* movw r3,#0x59F2  -> movw r3,#0x64C2 */
    {119, 0x0019AC08u, 0xE3060322u, 0xE3060DF2u}, /* movw r0,#0x6322  -> movw r0,#0x6DF2 */
    {120, 0x0019A800u, 0xE3510017u, 0xE351000Du}, /* cmp r1,#0x17    -> cmp r1,#0x0D */
    {121, 0x0019A84Cu, 0xE3510017u, 0xE351000Du}, /* cmp r1,#0x17    -> cmp r1,#0x0D */
    {122, 0x0019B11Cu, 0xE3540017u, 0xE354000Du}, /* cmp r4,#0x17    -> cmp r4,#0x0D */
    {123, 0x0019B360u, 0xE3510017u, 0xE351000Du}, /* cmp r1,#0x17    -> cmp r1,#0x0D */
};

#define IBOX_SITE_COUNT (sizeof(kIboxSites) / sizeof(kIboxSites[0]))
