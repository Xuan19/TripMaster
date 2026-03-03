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

    protected override void OnModelCreating(ModelBuilder modelBuilder)
    {
        modelBuilder.Entity<Trip>()
            .Property(t => t.Budget)
            .HasPrecision(18, 2);

        base.OnModelCreating(modelBuilder);
    }
}
