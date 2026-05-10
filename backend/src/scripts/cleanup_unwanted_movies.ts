import 'dotenv/config';
import { prisma } from '../db';

async function run() {
  console.log('🧹 [Cleanup] Bắt đầu rà soát và dọn dẹp các phim rác không liên quan...');

  // Lấy thời mốc bắt đầu chạy cập nhật lúc nãy (ví dụ trong vòng 4 tiếng qua)
  const fourHoursAgo = new Date(Date.now() - 4 * 60 * 60 * 1000);

  // Tìm các phim không có seriesId (không nằm trong sê-ri nào) và được tạo mới gần đây
  const candidateMovies = await prisma.movie.findMany({
    where: {
      seriesId: null,
      createdAt: {
        gte: fourHoursAgo
      }
    },
    include: {
      _count: {
        select: { episodes: true }
      }
    }
  });

  if (candidateMovies.length === 0) {
    console.log('✅ Không tìm thấy phim rác mới nào được tạo trong 4 tiếng qua.');
    return;
  }

  console.log(`🔍 Tìm thấy ${candidateMovies.length} phim không thuộc sê-ri nào được tạo mới gần đây:`);

  // Danh sách các từ khóa phim quý, hoạt hình chính chủ chúng ta cần bảo vệ, không được xóa
  const PROTECTED_KEYWORDS = [
    'đấu phá',
    'đấu la',
    'thế giới hoàn mỹ',
    'thôn phệ',
    'đại chúa tể',
    'tiên nghịch',
    'già thiên',
    'nghịch thiên',
    'tru tiên',
    'nhất niệm',
    'phàm nhân',
    'thần mộ',
    'tử xuyên'
  ];

  let deletedCount = 0;

  for (const movie of candidateMovies) {
    const titleLower = movie.title.toLowerCase();
    const isProtected = PROTECTED_KEYWORDS.some(kw => titleLower.includes(kw));

    if (isProtected) {
      console.log(`   🛡️  [Bảo vệ] Bỏ qua (không xóa): "${movie.title}"`);
      continue;
    }

    console.log(`   ❌ [Xóa] Đang xóa phim rác: "${movie.title}" (${movie._count.episodes} tập)...`);
    
    // Thao tác xóa cascade sẽ tự động xóa toàn bộ Episodes, Ratings, Comments liên kết nhờ Prisma onDelete: Cascade
    await prisma.movie.delete({
      where: { id: movie.id }
    });
    deletedCount++;
  }

  console.log(`\n========================================================================`);
  console.log(`🧹 HOÀN TẤT DỌN DẸP!`);
  console.log(`   - Tổng số phim rác không liên quan đã bị xóa sạch: ${deletedCount}`);
  console.log(`========================================================================\n`);
}

run()
  .catch(err => {
    console.error('❌ Lỗi dọn dẹp:', err);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
