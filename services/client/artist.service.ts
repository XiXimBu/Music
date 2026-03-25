import Artist, { IArtist } from "../../models/artist.model";
import Album from "../../models/album.model";
import Song, { ISong } from "../../models/song.model";
import mongoose, { Types } from "mongoose";

type AlbumByArtistItem = {
    _id: Types.ObjectId;
    title: string;
    thumbnail: string;
    artist: Types.ObjectId;
    slug: string;
    status: string;
    deleted?: boolean;
    releaseDate?: Date;
};

type SongItem = ISong & {
    _id: Types.ObjectId;
};

const getArtistBySlug = async (slug: string): Promise<IArtist | null> => {
    try {
        const normalizedSlug = decodeURIComponent(slug).trim();
        if (!normalizedSlug || normalizedSlug === "...") {
			return null;
		}

        const artist = await Artist.findOne({ 
            slug: normalizedSlug, 
            deleted: false 
        }).lean();
	
        return artist;
    } catch (error) {
        console.error(">>> Service getArtistBySlug error:", error);
        throw error;
    }
};


const getAlbumsByArtist = async (artistId: string): Promise<AlbumByArtistItem[]> => {
    try {
        
        const cleanId = artistId.trim();

        if (!mongoose.Types.ObjectId.isValid(cleanId)) {
            console.error("ID không hợp lệ:", cleanId);
            throw new Error("Invalid artistId format");
        }

        const normalizedArtistId = new Types.ObjectId(cleanId);

        const albums = await Album.find({
            artist: normalizedArtistId,
            deleted: false,
        })
        .select("title thumbnail artist slug ")
        .sort({ releaseDate: -1 })
        .lean<AlbumByArtistItem[]>();

        return albums;
    } catch (error) {
        console.error(">>> Service getAlbumsByArtist error:", error);
        throw error;
    }
};

const getAllSongs = async (artistId?: string): Promise<SongItem[]> => {
    try {
        const filter: {
            deleted: boolean;
            status: string;
            artists?: Types.ObjectId;
        } = {
            deleted: false,
            status: "active",
        };

        if (artistId) {
            const cleanId = artistId.trim();
            if (!mongoose.Types.ObjectId.isValid(cleanId)) {
                throw new Error("Invalid artistId format");
            }

            filter.artists = new Types.ObjectId(cleanId);
        }

        const songs = await Song.aggregate([
            { $match: filter },
            { $sort: { views: -1 } },
            { $limit: 10 },
            {
                $lookup: {
                    from: "artists",
                    localField: "artists",
                    foreignField: "_id",
                    pipeline: [{ $project: { _id: 1, name: 1 } }],
                    as: "artists",
                },
            },
            {
                $project: {
                    _id: 1,
                    title: 1,
                    duration: 1,
                    audioUrl: 1,
                    coverImage: 1,
                    views: 1,
                    artists: 1,
                },
            },
        ]) as SongItem[];

       
        
        return songs;
    } catch (error) {
        console.error(">>> Service getAllSongs error:", error);
        throw error;
    }
};



export default { getArtistBySlug, getAlbumsByArtist, getAllSongs };