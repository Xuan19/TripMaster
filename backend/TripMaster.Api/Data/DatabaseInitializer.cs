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
        await _db.Database.ExecuteSqlRawAsync(
            """
            IF OBJECT_ID(N'[Users]', N'U') IS NULL
            BEGIN
                CREATE TABLE [Users] (
                    [Id] INT IDENTITY(1,1) NOT NULL PRIMARY KEY,
                    [Username] NVARCHAR(64) NOT NULL,
                    [Email] NVARCHAR(256) NOT NULL,
                    [PasswordHash] NVARCHAR(MAX) NOT NULL,
                    [PasswordResetToken] NVARCHAR(256) NULL,
                    [PasswordResetTokenExpiresUtc] DATETIME2 NULL,
                    [CreatedAtUtc] DATETIME2 NOT NULL DEFAULT SYSUTCDATETIME()
                );
                CREATE UNIQUE INDEX [IX_Users_Username] ON [Users]([Username]);
                CREATE UNIQUE INDEX [IX_Users_Email] ON [Users]([Email]);
            END;
            """);

        await _db.Database.ExecuteSqlRawAsync(
            """
            IF COL_LENGTH('Users', 'Email') IS NULL
            BEGIN
                ALTER TABLE [Users] ADD [Email] NVARCHAR(256) NULL;
            END;
            """);

        await _db.Database.ExecuteSqlRawAsync(
            """
            IF COL_LENGTH('Users', 'PasswordResetToken') IS NULL
            BEGIN
                ALTER TABLE [Users] ADD [PasswordResetToken] NVARCHAR(256) NULL;
            END;
            """);

        await _db.Database.ExecuteSqlRawAsync(
            """
            IF COL_LENGTH('Users', 'PasswordResetTokenExpiresUtc') IS NULL
            BEGIN
                ALTER TABLE [Users] ADD [PasswordResetTokenExpiresUtc] DATETIME2 NULL;
            END;
            """);

        await _db.Database.ExecuteSqlRawAsync(
            """
            IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = 'IX_Users_Email' AND object_id = OBJECT_ID('Users'))
            BEGIN
                CREATE UNIQUE INDEX [IX_Users_Email]
                ON [Users]([Email])
                WHERE [Email] IS NOT NULL;
            END;
            """);

        await _db.Database.ExecuteSqlRawAsync(
            """
            IF COL_LENGTH('Trips', 'UserId') IS NULL
            BEGIN
                ALTER TABLE [Trips] ADD [UserId] INT NULL;
            END;
            """);

        await _db.Database.ExecuteSqlRawAsync(
            """
            IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = 'IX_Trips_UserId' AND object_id = OBJECT_ID('Trips'))
            BEGIN
                CREATE INDEX [IX_Trips_UserId] ON [Trips]([UserId]);
            END;
            """);

        await _db.Database.ExecuteSqlRawAsync(
            """
            IF NOT EXISTS (
                SELECT 1
                FROM sys.foreign_keys
                WHERE name = 'FK_Trips_Users_UserId'
            )
            BEGIN
                ALTER TABLE [Trips]
                ADD CONSTRAINT [FK_Trips_Users_UserId]
                FOREIGN KEY ([UserId]) REFERENCES [Users]([Id])
                ON DELETE CASCADE;
            END;
            """);
    }
}
