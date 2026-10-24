/* shot.h: grab the presented frame inside the game process (forge_onPresent), so screenshots work
 * while the window is covered, minimised to a small size or unfocused. Included once by dbgport.c.
 *
 * Flow: the socket command `shot <path>` sets s_shot_req. On the next forge_onPresent the swapchain
 * image (TRANSFER_DST_OPTIMAL on entry) is copied into a host-visible buffer inside Forge's command
 * buffer, then put back to TRANSFER_DST_OPTIMAL. One present later the buffer is complete and is
 * written as a 24-bit BMP. Only the Vulkan entry points used are declared here (no SDK needed). */
#include <stdint.h>

typedef uint64_t VkBuffer_;
typedef uint64_t VkDeviceMemory_;
typedef int32_t VkResult_;
typedef void (*PFN_void)(void);
typedef PFN_void (*PFN_GetInstanceProcAddr)(void* instance, const char* name);
typedef PFN_void (*PFN_GetDeviceProcAddr)(void* device, const char* name);

typedef struct {
    uint32_t sType; const void* pNext; uint32_t flags; uint64_t size; uint32_t usage;
    uint32_t sharingMode; uint32_t queueFamilyIndexCount; const uint32_t* pQueueFamilyIndices;
} VkBufferCreateInfo_;
typedef struct { uint64_t size, alignment; uint32_t memoryTypeBits; } VkMemoryRequirements_;
typedef struct { uint32_t sType; const void* pNext; uint64_t allocationSize; uint32_t memoryTypeIndex; } VkMemoryAllocateInfo_;
typedef struct { uint32_t propertyFlags, heapIndex; } VkMemoryType_;
typedef struct { uint64_t size; uint32_t flags; } VkMemoryHeap_;
typedef struct {
    uint32_t memoryTypeCount; VkMemoryType_ memoryTypes[32];
    uint32_t memoryHeapCount; VkMemoryHeap_ memoryHeaps[16];
} VkPhysicalDeviceMemoryProperties_;
typedef struct { uint32_t aspectMask, mipLevel, baseArrayLayer, layerCount; } VkImageSubresourceLayers_;
typedef struct { uint32_t aspectMask, baseMipLevel, levelCount, baseArrayLayer, layerCount; } VkImageSubresourceRange_;
typedef struct {
    uint64_t bufferOffset; uint32_t bufferRowLength, bufferImageHeight;
    VkImageSubresourceLayers_ imageSubresource; int32_t ox, oy, oz; uint32_t w, h, d;
} VkBufferImageCopy_;
typedef struct {
    uint32_t sType; const void* pNext; uint32_t srcAccessMask, dstAccessMask, oldLayout, newLayout;
    uint32_t srcQueueFamilyIndex, dstQueueFamilyIndex; uint64_t image; VkImageSubresourceRange_ subresourceRange;
} VkImageMemoryBarrier_;

#define VK_STYPE_BUFFER_CREATE 12u
#define VK_STYPE_MEMORY_ALLOCATE 5u
#define VK_STYPE_IMAGE_MEMORY_BARRIER 45u
#define VK_LAYOUT_TRANSFER_SRC 6u
#define VK_LAYOUT_TRANSFER_DST 7u
#define VK_ACCESS_TRANSFER_READ 0x800u
#define VK_ACCESS_TRANSFER_WRITE 0x1000u
#define VK_STAGE_TRANSFER 0x1000u
#define VK_USAGE_TRANSFER_DST 0x2u
#define VK_MEM_HOST_VISIBLE 0x2u
#define VK_MEM_HOST_COHERENT 0x4u
#define VK_ASPECT_COLOR 0x1u
#define VK_QUEUE_FAMILY_IGNORED 0xFFFFFFFFu

typedef VkResult_ (*PFN_CreateBuffer)(void*, const VkBufferCreateInfo_*, const void*, VkBuffer_*);
typedef void (*PFN_DestroyBuffer)(void*, VkBuffer_, const void*);
typedef void (*PFN_GetBufferMemReq)(void*, VkBuffer_, VkMemoryRequirements_*);
typedef VkResult_ (*PFN_AllocateMemory)(void*, const VkMemoryAllocateInfo_*, const void*, VkDeviceMemory_*);
typedef void (*PFN_FreeMemory)(void*, VkDeviceMemory_, const void*);
typedef VkResult_ (*PFN_BindBufferMemory)(void*, VkBuffer_, VkDeviceMemory_, uint64_t);
typedef VkResult_ (*PFN_MapMemory)(void*, VkDeviceMemory_, uint64_t, uint64_t, uint32_t, void**);
typedef void (*PFN_UnmapMemory)(void*, VkDeviceMemory_);
typedef void (*PFN_GetPhysMemProps)(void*, VkPhysicalDeviceMemoryProperties_*);
typedef void (*PFN_CmdPipelineBarrier)(void*, uint32_t, uint32_t, uint32_t, uint32_t, const void*, uint32_t,
                                       const void*, uint32_t, const VkImageMemoryBarrier_*);
typedef void (*PFN_CmdCopyImageToBuffer)(void*, uint64_t, uint32_t, VkBuffer_, uint32_t, const VkBufferImageCopy_*);
typedef VkResult_ (*PFN_DeviceWaitIdle)(void*);

static struct {
    void* device;
    PFN_CreateBuffer CreateBuffer; PFN_DestroyBuffer DestroyBuffer; PFN_GetBufferMemReq GetBufferMemoryRequirements;
    PFN_AllocateMemory AllocateMemory; PFN_FreeMemory FreeMemory; PFN_BindBufferMemory BindBufferMemory;
    PFN_MapMemory MapMemory; PFN_UnmapMemory UnmapMemory; PFN_CmdPipelineBarrier CmdPipelineBarrier;
    PFN_CmdCopyImageToBuffer CmdCopyImageToBuffer; PFN_DeviceWaitIdle DeviceWaitIdle;
    VkBuffer_ buf; VkDeviceMemory_ mem; uint64_t size; uint32_t w, h, format;
} s_vk;

static volatile LONG s_shot_req;   /* 1 = copy on next present */
static volatile LONG s_shot_state; /* 0 idle, 1 copy recorded (write on next present), 2 done, 3 failed */
static char s_shot_path[MAX_PATH];
static char s_shot_msg[256];

static bool vk_load(const ForgePresent* p)
{
    if (s_vk.device == p->vk_device && s_vk.CreateBuffer) {
        return true;
    }
    PFN_GetInstanceProcAddr gipa = (PFN_GetInstanceProcAddr)p->vk_get_instance_proc;
    PFN_GetDeviceProcAddr gdpa = (PFN_GetDeviceProcAddr)gipa(p->vk_instance, "vkGetDeviceProcAddr");
    if (!gdpa) {
        return false;
    }
    s_vk.device = p->vk_device;
#define LD(f, n) s_vk.f = (void*)gdpa(p->vk_device, n)
    LD(CreateBuffer, "vkCreateBuffer"); LD(DestroyBuffer, "vkDestroyBuffer");
    LD(GetBufferMemoryRequirements, "vkGetBufferMemoryRequirements"); LD(AllocateMemory, "vkAllocateMemory");
    LD(FreeMemory, "vkFreeMemory"); LD(BindBufferMemory, "vkBindBufferMemory"); LD(MapMemory, "vkMapMemory");
    LD(UnmapMemory, "vkUnmapMemory"); LD(CmdPipelineBarrier, "vkCmdPipelineBarrier");
    LD(CmdCopyImageToBuffer, "vkCmdCopyImageToBuffer"); LD(DeviceWaitIdle, "vkDeviceWaitIdle");
#undef LD
    return s_vk.CreateBuffer && s_vk.CmdCopyImageToBuffer && s_vk.MapMemory;
}

static void vk_free_buf(void)
{
    if (s_vk.buf) { s_vk.DestroyBuffer(s_vk.device, s_vk.buf, NULL); s_vk.buf = 0; }
    if (s_vk.mem) { s_vk.FreeMemory(s_vk.device, s_vk.mem, NULL); s_vk.mem = 0; }
    s_vk.size = 0;
}

static bool vk_ensure_buf(const ForgePresent* p, uint64_t size)
{
    if (s_vk.buf && s_vk.size == size) {
        return true;
    }
    vk_free_buf();
    VkBufferCreateInfo_ bi = {VK_STYPE_BUFFER_CREATE, NULL, 0, size, VK_USAGE_TRANSFER_DST, 0, 0, NULL};
    if (s_vk.CreateBuffer(s_vk.device, &bi, NULL, &s_vk.buf) != 0) {
        return false;
    }
    VkMemoryRequirements_ req;
    s_vk.GetBufferMemoryRequirements(s_vk.device, s_vk.buf, &req);
    PFN_GetInstanceProcAddr gipa = (PFN_GetInstanceProcAddr)p->vk_get_instance_proc;
    PFN_GetPhysMemProps gpmp = (PFN_GetPhysMemProps)gipa(p->vk_instance, "vkGetPhysicalDeviceMemoryProperties");
    VkPhysicalDeviceMemoryProperties_ mp;
    gpmp(p->vk_physical_device, &mp);
    uint32_t type = UINT32_MAX;
    for (uint32_t i = 0; i < mp.memoryTypeCount; i++) {
        uint32_t want = VK_MEM_HOST_VISIBLE | VK_MEM_HOST_COHERENT;
        if ((req.memoryTypeBits & (1u << i)) && (mp.memoryTypes[i].propertyFlags & want) == want) { type = i; break; }
    }
    VkMemoryAllocateInfo_ ai = {VK_STYPE_MEMORY_ALLOCATE, NULL, req.size, type};
    if (type == UINT32_MAX || s_vk.AllocateMemory(s_vk.device, &ai, NULL, &s_vk.mem) != 0 ||
        s_vk.BindBufferMemory(s_vk.device, s_vk.buf, s_vk.mem, 0) != 0) {
        vk_free_buf();
        return false;
    }
    s_vk.size = size;
    return true;
}

static void image_barrier(void* cmd, uint64_t image, uint32_t from, uint32_t to, uint32_t src_access, uint32_t dst_access)
{
    VkImageMemoryBarrier_ b = {VK_STYPE_IMAGE_MEMORY_BARRIER, NULL, src_access, dst_access, from, to,
                               VK_QUEUE_FAMILY_IGNORED, VK_QUEUE_FAMILY_IGNORED, image, {VK_ASPECT_COLOR, 0, 1, 0, 1}};
    s_vk.CmdPipelineBarrier(cmd, VK_STAGE_TRANSFER, VK_STAGE_TRANSFER, 0, 0, NULL, 0, NULL, 1, &b);
}

/* BGRA8/RGBA8 (formats 44/50 = B8G8R8A8 UNORM/SRGB, 37/43 = R8G8B8A8) to a bottom-up 24-bit BMP. */
static bool write_bmp(const char* path, const uint8_t* px, uint32_t w, uint32_t h, uint32_t format)
{
    const bool bgra = format == 44 || format == 50;
    const uint32_t row = (w * 3 + 3) & ~3u;
    FILE* f = fopen(path, "wb");
    if (!f) {
        return false;
    }
    uint8_t hdr[54] = {'B', 'M'};
    uint32_t file_size = 54 + row * h, v;
    memcpy(hdr + 2, &file_size, 4);
    v = 54; memcpy(hdr + 10, &v, 4);
    v = 40; memcpy(hdr + 14, &v, 4);
    memcpy(hdr + 18, &w, 4);
    memcpy(hdr + 22, &h, 4);
    hdr[26] = 1; hdr[28] = 24;
    fwrite(hdr, 1, 54, f);
    uint8_t* line = (uint8_t*)calloc(row, 1);
    for (uint32_t y = 0; y < h; y++) {
        const uint8_t* src = px + (size_t)(h - 1 - y) * w * 4;
        for (uint32_t x = 0; x < w; x++) {
            line[x * 3 + 0] = bgra ? src[x * 4 + 0] : src[x * 4 + 2];
            line[x * 3 + 1] = src[x * 4 + 1];
            line[x * 3 + 2] = bgra ? src[x * 4 + 2] : src[x * 4 + 0];
        }
        fwrite(line, 1, row, f);
    }
    free(line);
    fclose(f);
    return true;
}

static void shot_present(const ForgePresent* p)
{
    if (s_shot_state == 1) {
        /* the copy was recorded into the previous present's command buffer, which has been
         * submitted since; wait for the device so the buffer is complete */
        s_vk.DeviceWaitIdle(s_vk.device);
        void* map = NULL;
        bool ok = s_vk.MapMemory(s_vk.device, s_vk.mem, 0, s_vk.size, 0, &map) == 0 &&
                  write_bmp(s_shot_path, (const uint8_t*)map, s_vk.w, s_vk.h, s_vk.format);
        if (map) {
            s_vk.UnmapMemory(s_vk.device, s_vk.mem);
        }
        snprintf(s_shot_msg, sizeof(s_shot_msg), ok ? "ok %ux%u fmt %u %s" : "err write %s", s_vk.w, s_vk.h,
                 s_vk.format, s_shot_path);
        InterlockedExchange(&s_shot_state, ok ? 2 : 3);
        return;
    }
    if (!InterlockedCompareExchange(&s_shot_req, 0, 1)) {
        return;
    }
    if (!vk_load(p) || !vk_ensure_buf(p, (uint64_t)p->width * p->height * 4)) {
        snprintf(s_shot_msg, sizeof(s_shot_msg), "err vulkan setup");
        InterlockedExchange(&s_shot_state, 3);
        return;
    }
    s_vk.w = p->width; s_vk.h = p->height; s_vk.format = p->vk_format;
    image_barrier(p->vk_command_buffer, p->vk_image, VK_LAYOUT_TRANSFER_DST, VK_LAYOUT_TRANSFER_SRC,
                  VK_ACCESS_TRANSFER_WRITE, VK_ACCESS_TRANSFER_READ);
    VkBufferImageCopy_ r = {0, 0, 0, {VK_ASPECT_COLOR, 0, 0, 1}, 0, 0, 0, p->width, p->height, 1};
    s_vk.CmdCopyImageToBuffer(p->vk_command_buffer, p->vk_image, VK_LAYOUT_TRANSFER_SRC, s_vk.buf, 1, &r);
    image_barrier(p->vk_command_buffer, p->vk_image, VK_LAYOUT_TRANSFER_SRC, VK_LAYOUT_TRANSFER_DST,
                  VK_ACCESS_TRANSFER_READ, VK_ACCESS_TRANSFER_WRITE);
    InterlockedExchange(&s_shot_state, 1);
}
