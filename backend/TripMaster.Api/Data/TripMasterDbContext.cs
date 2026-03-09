using Microsoft.EntityFrameworkCore;
using TripMaster.Api.Models;

namespace TripMaster.Api.Data;

public class TripMasterDbContext : DbContext
{
    public TripMasterDbContext(DbContextOptions<TripMasterDbContext> options)
        : base(options)
    {
    }

    public DbSet<Trip> Trips => Set<Trip>();
    public DbSet<User> Users => Set<User>();

    protected override void OnModelCreating(ModelBuilder modelBuilder)
    {
        modelBuilder.Entity<Trip>()
            .Property(t => t.Budget)
            .HasPrecision(18, 2);

        modelBuilder.Entity<Trip>()
            .Property(t => t.DetailsJson)
            .HasColumnType("nvarchar(max)");

        modelBuilder.Entity<User>()
            .Property(u => u.Username)
            .HasMaxLength(64);

        modelBuilder.Entity<User>()
            .Property(u => u.Email)
            .HasMaxLength(256);

        modelBuilder.Entity<User>()
            .HasIndex(u => u.Username)
            .IsUnique();

        modelBuilder.Entity<User>()
            .HasIndex(u => u.Email)
            .IsUnique()
            .HasFilter("[Email] IS NOT NULL");

        modelBuilder.Entity<Trip>()
            .HasOne(t => t.User)
            .WithMany(u => u.Trips)
            .HasForeignKey(t => t.UserId)
            .OnDelete(DeleteBehavior.Cascade);

        base.OnModelCreating(modelBuilder);
    }
}
