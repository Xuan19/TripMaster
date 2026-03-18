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
    }
}
