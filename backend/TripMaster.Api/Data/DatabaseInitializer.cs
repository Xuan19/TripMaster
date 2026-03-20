using Microsoft.EntityFrameworkCore;

namespace TripMaster.Api.Data;

public class DatabaseInitializer
{
    private readonly TripMasterDbContext _db;

    public DatabaseInitializer(TripMasterDbContext db)
    {
        _db = db;
    }

    public async Task InitializeAsync()
    {
        await _db.Database.EnsureCreatedAsync();
        await EnsureUserColumnsAsync();
    }

    private async Task EnsureUserColumnsAsync()
    {
        if (_db.Database.IsNpgsql())
        {
            await _db.Database.ExecuteSqlRawAsync("""
                ALTER TABLE "Users"
                ADD COLUMN IF NOT EXISTS "IsEmailVerified" boolean NOT NULL DEFAULT FALSE;
                ALTER TABLE "Users"
                ADD COLUMN IF NOT EXISTS "EmailVerificationToken" character varying(128);
                ALTER TABLE "Users"
                ADD COLUMN IF NOT EXISTS "EmailVerificationTokenExpiresUtc" timestamp with time zone;
                """);
            return;
        }

        if (_db.Database.IsSqlServer())
        {
            await _db.Database.ExecuteSqlRawAsync("""
                IF COL_LENGTH('Users', 'IsEmailVerified') IS NULL
                    ALTER TABLE [Users] ADD [IsEmailVerified] bit NOT NULL CONSTRAINT DF_Users_IsEmailVerified DEFAULT 0;
                IF COL_LENGTH('Users', 'EmailVerificationToken') IS NULL
                    ALTER TABLE [Users] ADD [EmailVerificationToken] nvarchar(128) NULL;
                IF COL_LENGTH('Users', 'EmailVerificationTokenExpiresUtc') IS NULL
                    ALTER TABLE [Users] ADD [EmailVerificationTokenExpiresUtc] datetime2 NULL;
                """);
        }
    }
}
