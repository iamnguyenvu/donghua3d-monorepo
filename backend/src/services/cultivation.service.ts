import { prisma } from '../db';

export function getCultivationRank(level: number): string {
  if (level < 10) return "Luyện Khí Kỳ";
  if (level < 20) return "Trúc Cơ Kỳ";
  if (level < 30) return "Kim Đan Kỳ";
  if (level < 40) return "Nguyên Anh Kỳ";
  if (level < 50) return "Hóa Thần Kỳ";
  if (level < 60) return "Luyện Hư Kỳ";
  if (level < 70) return "Hợp Thể Kỳ";
  if (level < 80) return "Đại Thừa Kỳ";
  if (level < 90) return "Độ Kiếp Kỳ";
  return "Tiên Nhân";
}

export const cultivationService = {
  /**
   * Awards Exp and DonghuaCoins to a user, checking for level ups.
   */
  async awardCultivationRewards(userId: string, expReward: number, coinReward: number): Promise<{ levelUp: boolean; newLevel: number }> {
    try {
      const user = await prisma.user.findUnique({ where: { id: userId } });
      if (!user) {
        throw new Error(`User not found: ${userId}`);
      }

      let newExp = user.exp + expReward;
      let newLevel = user.level;
      let newRank = user.cultivationRank;
      let levelUp = false;

      let requiredExp = newLevel * 100;
      
      // Loop to handle potential multiple level ups if the reward is very large
      while (newExp >= requiredExp) {
        newExp -= requiredExp;
        newLevel += 1;
        levelUp = true;
        requiredExp = newLevel * 100;
      }

      if (levelUp) {
        newRank = getCultivationRank(newLevel);
      }

      await prisma.user.update({
        where: { id: userId },
        data: {
          exp: newExp,
          level: newLevel,
          cultivationRank: newRank,
          donghuaCoins: { increment: coinReward }
        }
      });

      console.log(`[Cultivation Service] Awarded user ${userId} +${expReward} EXP, +${coinReward} Coins. New Level: ${newLevel}`);
      return { levelUp, newLevel };
    } catch (err: any) {
      console.error(`[Cultivation Service Error] Failed to award rewards to user ${userId}:`, err.message);
      return { levelUp: false, newLevel: 1 };
    }
  }
};
